"""The D19 guard is only correct while it mirrors the fold migration 0002 applied.

0002 wrote `subject_age_band` from `age_group` through a `CASE`. 0017 refuses to
drop the column when a row disagrees with that same fold. If someone edits one
mapping and not the other, the guard starts asking about the wrong values — it
would either wave through real disagreement or block a clean database. This test
reads both and compares them, so the two cannot drift apart silently.
"""

import codecs
import importlib.util
import re
from pathlib import Path
from types import ModuleType

from psihointegritet.modules.guidance.models import SubjectAgeBand

_VERSIONS = Path(__file__).resolve().parents[2] / "src/psihointegritet/db/migrations/versions"
_FOLD_MIGRATION = _VERSIONS / "20260722_0002_anja_intake_refinement.py"
_GUARD_MIGRATION = _VERSIONS / "20260803_0017_d19_schema_drift.py"

_WHEN_CLAUSE = re.compile(r"WHEN '([^']+)' THEN '([^']+)'")


def _load(path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(path.stem, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _fold_mapping_from_source() -> dict[str, str]:
    """Extract the `subject_age_band = CASE age_group … END` pairs from 0002."""
    source = _FOLD_MIGRATION.read_text(encoding="utf-8")
    start = source.index("subject_age_band = CASE age_group")
    end = source.index("END", start)
    block = source[start:end]
    return {
        # The 0002 source spells the en dash as a `\uXXXX` escape inside a normal
        # string literal, so the file text carries the escape, not the character.
        codecs.decode(group, "unicode_escape"): band
        for group, band in _WHEN_CLAUSE.findall(block)
    }


def test_guard_mapping_matches_the_fold_migration_exactly() -> None:
    guard_mapping = _load(_GUARD_MIGRATION)._AGE_GROUP_TO_BAND
    fold_mapping = _fold_mapping_from_source()
    assert guard_mapping == fold_mapping


def test_every_mapped_band_is_a_real_subject_age_band() -> None:
    bands = set(_load(_GUARD_MIGRATION)._AGE_GROUP_TO_BAND.values())
    assert bands <= {band.value for band in SubjectAgeBand}
    # `adult` is deliberately absent: it was 0002's `ELSE` answer for everything
    # unrecognised, which is exactly the case the guard must refuse rather than
    # silently reproduce.
    assert SubjectAgeBand.ADULT.value not in bands
