"""Production CMS writes must not depend on a database locale default."""

import ast
import re
from pathlib import Path

from psihointegritet.modules.content.models import ContentEntry

BACKEND_ROOT = Path(__file__).resolve().parents[2]
WRITE_ROOTS = (BACKEND_ROOT / "src", BACKEND_ROOT / "scripts")
INSERT_PATTERN = re.compile(
    r"insert\s+into\s+content_entries\s*\((?P<columns>[^)]*)\)",
    re.IGNORECASE | re.DOTALL,
)


def production_python_files() -> list[Path]:
    return [
        path
        for root in WRITE_ROOTS
        for path in root.rglob("*.py")
        if "db/migrations" not in path.as_posix()
    ]


def test_every_orm_content_entry_write_supplies_locale() -> None:
    missing: list[str] = []
    for path in production_python_files():
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Name) or node.func.id != "ContentEntry":
                continue
            if not any(keyword.arg == "locale" for keyword in node.keywords):
                missing.append(f"{path.relative_to(BACKEND_ROOT)}:{node.lineno}")

    assert missing == [], f"ContentEntry writes without locale: {missing}"


def test_every_raw_sql_content_entry_insert_supplies_locale() -> None:
    missing: list[str] = []
    for path in production_python_files():
        source = path.read_text(encoding="utf-8")
        for match in INSERT_PATTERN.finditer(source):
            columns = {column.strip().lower() for column in match.group("columns").split(",")}
            if "locale" not in columns:
                line = source.count("\n", 0, match.start()) + 1
                missing.append(f"{path.relative_to(BACKEND_ROOT)}:{line}")

    assert missing == [], f"Raw content_entries inserts without locale: {missing}"


def test_the_orm_model_has_no_locale_default() -> None:
    locale = ContentEntry.__table__.columns["locale"]  # pyright: ignore[reportUnknownMemberType]
    assert locale.default is None
    assert locale.server_default is None
