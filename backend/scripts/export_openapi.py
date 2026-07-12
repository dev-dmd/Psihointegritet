"""Deterministically export the FastAPI OpenAPI schema to backend/openapi.json.

Usage: uv run python scripts/export_openapi.py
"""

import json
from pathlib import Path

from psihointegritet.main import create_app


def main() -> None:
    schema = create_app().openapi()
    output = Path(__file__).resolve().parent.parent / "openapi.json"
    output.write_text(
        json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
