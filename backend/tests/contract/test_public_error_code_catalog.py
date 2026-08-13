"""Locks every public machine error code to the presentation contract."""

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE_ROOT = ROOT / "backend" / "src" / "psihointegritet"
FIXTURE = json.loads(
    (ROOT / "contracts" / "fixtures" / "public-api-error-codes.v1.json").read_text(encoding="utf-8")
)
DOMAIN_ERROR_CALLS = {
    "CompassFlowError",
    "CompassVersionError",
    "ResearchError",
    "TaxonomyConflictError",
    "TaxonomyForbiddenError",
    "TaxonomyNotFoundError",
    "TaxonomyValidationError",
}


def _string(node: ast.expr | None) -> str | None:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def _public_codes() -> set[str]:
    codes = {"http_error", "validation_error", "internal_error"}
    for path in SOURCE_ROOT.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Dict):
                for key, value in zip(node.keys, node.values, strict=True):
                    if _string(key) == "code" and (code := _string(value)):
                        codes.add(code)
            if isinstance(node, ast.Call):
                name = (
                    node.func.id
                    if isinstance(node.func, ast.Name)
                    else node.func.attr
                    if isinstance(node.func, ast.Attribute)
                    else ""
                )
                if name in DOMAIN_ERROR_CALLS and node.args and (code := _string(node.args[0])):
                    codes.add(code)
                if name == "ApiProblem":
                    for keyword in node.keywords:
                        if keyword.arg == "code" and (code := _string(keyword.value)):
                            codes.add(code)
            if isinstance(node, ast.ClassDef):
                for child in node.body:
                    if not isinstance(child, ast.Assign) or len(child.targets) != 1:
                        continue
                    target = child.targets[0]
                    code = _string(child.value)
                    if (
                        isinstance(target, ast.Name)
                        and code
                        and (target.id == "code" or node.name.endswith("ErrorCode"))
                    ):
                        codes.add(code)
    return codes


def test_public_backend_codes_match_the_shared_presentation_fixture() -> None:
    assert sorted(_public_codes()) == FIXTURE["codes"]
