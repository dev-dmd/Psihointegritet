"""Publication policy for CMS content (CG-B2).

The lifecycle itself lives in `shared/domain/publication.py`. What this module
owns is the content business rule: which approvals a type and template need,
how a finding can add one, and the staged evaluation that decides whether a
revision may publish.

**Check order is contract A.4 and is not negotiable:** content → transition →
approvals. An `error` finding stops the evaluation, so the admin first sees
"this section is empty" instead of a list of signatures they cannot obtain
yet. `warning` and `info` never stop it, but a finding of any severity that
carries `requires_approval` still adds that capability to the requirement set
(contract A.3).

**Security boundary:** `extra_findings` must be produced server-side. A client
may not hand in "no findings" and publish unreviewed content — the router
(CG-B4) computes them, never the request body.
"""

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Literal, cast

from psihointegritet.modules.content.models import (
    ContentTemplate,
    ContentType,
    ReviewOutcome,
)
from psihointegritet.modules.content.slot_schema import (
    SLOT_SPEC_REGISTRY,
    CollectionFieldSpec,
    CtaListFieldSpec,
    EditableSlot,
    RepeaterFieldSpec,
)
from psihointegritet.shared.domain.publication import (
    ALLOWED_TRANSITIONS,
    ApprovalCapability,
    CannotDeleteRevisionError,
    InvalidRevisionTransitionError,
    RevisionStatus,
    can_delete,
    can_transition,
    reissues_revision,
    require_deletable,
    require_transition,
)

__all__ = [
    "ALLOWED_TRANSITIONS",
    "BASE_REQUIRED_APPROVALS",
    "TEMPLATE_REGISTRY",
    "TEMPLATE_REQUIRED_APPROVALS",
    "CannotDeleteRevisionError",
    "ContentFinding",
    "ContentPublishCheck",
    "InvalidRevisionTransitionError",
    "MissingApprovalError",
    "PublishStage",
    "ReviewDecisionRecord",
    "Severity",
    "TemplateDefinition",
    "can_delete",
    "can_transition",
    "check_publishable",
    "dynamic_approvals",
    "effective_required_approvals",
    "granted_capabilities",
    "reissues_revision",
    "require_deletable",
    "require_publishable",
    "require_transition",
    "required_approvals",
    "structural_findings",
]

# D-032 vocabulary. `block`, `review_required` and `passed` are display classes
# derived from these values plus `requires_approval`, never stored severities.
Severity = Literal["info", "warning", "error"]

PublishStage = Literal["content", "transition", "approvals"]

# Shared empty default. `frozenset` is immutable, so one instance is safe as a
# dataclass default and keeps the field's element type inferable.
NO_CAPABILITIES: frozenset[ApprovalCapability] = frozenset()


class MissingApprovalError(ValueError):
    """Raised when a revision would publish without its required approvals."""


@dataclass(frozen=True)
class ContentFinding:
    """One validation result against a revision (D-044 shape).

    `requires_approval` is what turns a finding into the REVIEW_REQUIRED
    display class: the content may be structurally fine, but a named
    capability must sign off before it goes public.
    """

    rule_id: str
    rule_version: str
    severity: Severity
    message: str
    remediation: str
    field_path: str | None = None
    requires_approval: ApprovalCapability | None = None


@dataclass(frozen=True)
class ReviewDecisionRecord:
    """Port shape of a `ContentReviewDecision` row, without the ORM."""

    capability: ApprovalCapability
    outcome: ReviewOutcome


@dataclass(frozen=True)
class TemplateDefinition:
    required_slots: tuple[str, ...]
    optional_slots: tuple[str, ...]


@dataclass(frozen=True)
class ContentPublishCheck:
    """Outcome of the staged evaluation.

    `stage` names the first blocking stage, or is None when publishing may
    proceed. `findings` always carries the content-stage results, including
    non-blocking ones, so the panel can show warnings on a revision that is
    otherwise publishable.
    """

    ok: bool
    stage: PublishStage | None
    findings: tuple[ContentFinding, ...] = ()
    missing: frozenset[ApprovalCapability] = NO_CAPABILITIES


# Mirrors `templateRegistry` in frontend/src/lib/content-governance/limits.ts.
# The editor may fill a slot or add an allowed repeatable item up to the
# maximum; it may never introduce a new section type (CONTENT_MODEL_MATRIX §4).
#
# `max_optional_sections` (a template-level cap on how many optional slot
# *keys* may be present) was removed here 2026-07-30 (ADR-017 Amendment 2
# §A2.2, D-050) — it counted the wrong thing. See `structural_findings`
# below for where that authority now lives (`slot_schema.SLOT_SPEC_REGISTRY`
# collection field `min`/`max`).
TEMPLATE_REGISTRY: Mapping[ContentTemplate, TemplateDefinition] = {
    ContentTemplate.SERVICE_DETAIL: TemplateDefinition(
        required_slots=("hero", "facts", "description", "first_step", "related", "cta"),
        optional_slots=("packages", "faq"),
    ),
    ContentTemplate.THERAPIST_PROFILE: TemplateDefinition(
        required_slots=("hero", "approach", "areas", "services", "bio", "cta"),
        optional_slots=("faq", "media"),
    ),
    ContentTemplate.SUPPORT_AREA: TemplateDefinition(
        required_slots=("hero", "intro", "related", "cta"),
        optional_slots=("faq",),
    ),
    ContentTemplate.AUDIENCE_PAGE: TemplateDefinition(
        required_slots=("hero", "audience", "first_step", "related", "cta"),
        optional_slots=("program_cards", "faq"),
    ),
    ContentTemplate.PROGRAM_DETAIL: TemplateDefinition(
        required_slots=("hero", "facts", "audience", "format", "status"),
        optional_slots=("facilitators", "faq", "registration"),
    ),
    ContentTemplate.COMPANY_PAGE: TemplateDefinition(
        required_slots=("hero", "support_types", "plans", "privacy", "configurator_cta"),
        optional_slots=("faq",),
    ),
    ContentTemplate.PRICING_PAGE: TemplateDefinition(
        required_slots=("service_prices", "packages", "notice", "cta"),
        optional_slots=("program_references",),
    ),
    ContentTemplate.STATIC_INFORMATION: TemplateDefinition(
        required_slots=("hero", "intro"),
        optional_slots=("prose", "cta", "faq"),
    ),
    ContentTemplate.LEGAL_PAGE: TemplateDefinition(
        required_slots=("title", "legal_copy", "version"),
        optional_slots=("links",),
    ),
}

# Baseline per content type, from CONTENT_GOVERNANCE_CONTRACT §6 and
# CONTENT_PUBLISH_GATES §4.
#
# `business` is the floor for every type: publishing changes what the public
# site claims about the centre, and Engines §9.3 puts brand, CTA, price and
# publication with the organization admin. Neither source document lists a
# public content type that publishes with no approval at all, so requiring one
# signature is the conservative reading rather than an invented rule. Relaxing
# it for plain informational pages would be a product decision, not a code
# change made in passing.
BASE_REQUIRED_APPROVALS: Mapping[ContentType, frozenset[ApprovalCapability]] = {
    ContentType.STATIC_PAGE: frozenset({ApprovalCapability.BUSINESS}),
    ContentType.SERVICE: frozenset({ApprovalCapability.BUSINESS}),
    ContentType.THERAPIST: frozenset({ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}),
    ContentType.PROGRAM: frozenset({ApprovalCapability.BUSINESS}),
    ContentType.COMPANY_PLAN: frozenset({ApprovalCapability.BUSINESS}),
    ContentType.PACKAGE_OFFER: frozenset({ApprovalCapability.BUSINESS}),
}

# Additive per template, because one content type can render as different
# public surfaces: a `static_page` on `legal_page` is a legal text and needs
# `legal`, while the same type on `static_information` does not.
TEMPLATE_REQUIRED_APPROVALS: Mapping[ContentTemplate, frozenset[ApprovalCapability]] = {
    ContentTemplate.LEGAL_PAGE: frozenset({ApprovalCapability.LEGAL}),
    ContentTemplate.THERAPIST_PROFILE: frozenset({ApprovalCapability.CLINICAL}),
    ContentTemplate.SUPPORT_AREA: frozenset({ApprovalCapability.CLINICAL}),
    ContentTemplate.AUDIENCE_PAGE: frozenset({ApprovalCapability.CLINICAL}),
    ContentTemplate.SERVICE_DETAIL: frozenset(),
    ContentTemplate.PROGRAM_DETAIL: frozenset(),
    ContentTemplate.COMPANY_PAGE: frozenset(),
    ContentTemplate.PRICING_PAGE: frozenset(),
    ContentTemplate.STATIC_INFORMATION: frozenset(),
}


def required_approvals(
    content_type: ContentType, template: ContentTemplate
) -> frozenset[ApprovalCapability]:
    """Static requirement for this offer surface, before any finding adds to it."""
    return BASE_REQUIRED_APPROVALS[content_type] | TEMPLATE_REQUIRED_APPROVALS[template]


def dynamic_approvals(
    findings: Iterable[ContentFinding],
) -> frozenset[ApprovalCapability]:
    """Capabilities demanded by findings, at any severity (contract A.3)."""
    return frozenset(
        finding.requires_approval for finding in findings if finding.requires_approval is not None
    )


def effective_required_approvals(
    content_type: ContentType,
    template: ContentTemplate,
    findings: Iterable[ContentFinding] = (),
) -> frozenset[ApprovalCapability]:
    """Static matrix plus anything the findings added; findings never remove."""
    return required_approvals(content_type, template) | dynamic_approvals(findings)


def granted_capabilities(
    decisions: Iterable[ReviewDecisionRecord],
) -> frozenset[ApprovalCapability]:
    """Only an `approved` decision grants; `rejected` is not an approval."""
    return frozenset(
        decision.capability for decision in decisions if decision.outcome is ReviewOutcome.APPROVED
    )


def structural_findings(
    template: ContentTemplate, slot_data: Mapping[str, object]
) -> tuple[ContentFinding, ...]:
    """Template-shape checks the backend can run on its own.

    This is the independent template-shape floor. CG-D4's
    `modules/content/health.py` adds field/mode, RichDoc, CTA, asset and limit
    findings, while the TypeScript pass validates the merged public fallback
    and discoverability output. `MODEL-004` is an additive rule ID for a
    missing required slot, which `MODEL-003` (a disallowed slot) does not
    cover. A required slot whose `SLOT_SPEC_REGISTRY` entry is `computed` is
    exempt from `MODEL-004` — it is derived at render time and is never
    expected to appear in `slot_data` at all.

    **`LIMIT-002` (ADR-017 Amendment 2 §A2.2, D-050).** The original design
    counted optional slot *keys* against a template-level maximum
    (`max_optional_sections`) — always unreachable, since it counted the
    wrong thing: an editor can pre-initialize every optional slot as an
    empty object (key present, section inert), and a single FAQ slot with
    nine items was always the real problem regardless of how many slot keys
    existed. The real rule: an `editable` slot's stored value is the
    `SlotOverride` wrapper (`{mode, fields?}`, Amendment 2 §A2.3) — for every
    `imageList`/`ctaList`/`repeater` field declared in
    `slot_schema.SLOT_SPEC_REGISTRY`, if `fields` is present and is a
    mapping, that field's array length must fall within the field's own
    `min`/`max`. A slot whose stored value is not (yet) shaped as
    `SlotOverride` — e.g. the plain strings this module's own tests use as
    placeholder content, or a `mode: "inherit"`/`"hidden"` value with no
    `fields` at all — has nothing to check here; that is `MODEL-004`'s
    concern, not this one's.
    """
    definition = TEMPLATE_REGISTRY[template]
    slot_specs = SLOT_SPEC_REGISTRY[template]
    findings: list[ContentFinding] = []

    for slot in definition.required_slots:
        if slot_specs[slot].editability == "computed":
            continue
        value = slot_data.get(slot)
        if value is None or (isinstance(value, str) and not value.strip()):
            findings.append(
                ContentFinding(
                    rule_id="MODEL-004",
                    rule_version="1",
                    severity="error",
                    message=f"Obavezna sekcija „{slot}” nije popunjena.",
                    remediation="Popunite sekciju ili vratite reviziju na doradu.",
                    field_path=slot,
                )
            )

    allowed = set(definition.required_slots) | set(definition.optional_slots)
    for slot in sorted(set(slot_data) - allowed):
        findings.append(
            ContentFinding(
                rule_id="MODEL-003",
                rule_version="1",
                severity="error",
                message=f"Sekcija „{slot}” nije dozvoljena za ovaj template.",
                remediation="Koristite odobren template registry.",
                field_path=slot,
            )
        )

    for slot in sorted(allowed & set(slot_data)):
        spec = slot_specs[slot]
        if not isinstance(spec, EditableSlot):
            continue
        raw_slot_value = slot_data[slot]
        if not isinstance(raw_slot_value, Mapping):
            continue
        # `isinstance(raw_slot_value, Mapping)` alone narrows to
        # `Mapping[Unknown, Unknown]` under strict pyright — same gap as
        # `_as_dict` in `shared/domain/rich_doc.py`. `slot_data` is trusted
        # JSON-column content, so `.get()` returning `object` is what every
        # call site here already assumes.
        slot_override = cast("Mapping[str, object]", raw_slot_value)
        raw_fields = slot_override.get("fields")
        if not isinstance(raw_fields, Mapping):
            # `mode: "inherit"`/`"hidden"` carries no `fields` at all —
            # nothing to check against the collection limits below.
            continue
        slot_value = cast("Mapping[str, object]", raw_fields)
        for field_name, field_spec in spec.fields.items():
            if not isinstance(
                field_spec, CollectionFieldSpec | CtaListFieldSpec | RepeaterFieldSpec
            ):
                continue
            field_value = slot_value.get(field_name)
            # Same `list[Unknown]` narrowing gap as above.
            count = len(cast("list[object]", field_value)) if isinstance(field_value, list) else 0
            if not (field_spec.min <= count <= field_spec.max):
                findings.append(
                    ContentFinding(
                        rule_id="LIMIT-002",
                        rule_version="1",
                        severity="error",
                        message=(
                            f"Broj stavki u „{slot}.{field_name}” ({count}) je van "
                            f"dozvoljenog opsega [{field_spec.min}, {field_spec.max}]."
                        ),
                        remediation="Dodati ili ukloniti stavke do dozvoljenog broja.",
                        field_path=f"{slot}.{field_name}",
                    )
                )

    return tuple(findings)


def check_publishable(
    content_type: ContentType,
    template: ContentTemplate,
    status: RevisionStatus,
    slot_data: Mapping[str, object],
    decisions: Iterable[ReviewDecisionRecord] = (),
    extra_findings: Sequence[ContentFinding] = (),
) -> ContentPublishCheck:
    """Staged evaluation: content → transition → approvals (contract A.4).

    `extra_findings` are the server-computed results of rules this module does
    not own. They are merged with the structural findings before the first
    stage decides, so a rule from either source can block or demand a review.
    """
    findings = structural_findings(template, slot_data) + tuple(extra_findings)

    if any(finding.severity == "error" for finding in findings):
        return ContentPublishCheck(ok=False, stage="content", findings=findings)

    if not can_transition(status, RevisionStatus.PUBLISHED):
        return ContentPublishCheck(ok=False, stage="transition", findings=findings)

    missing = effective_required_approvals(content_type, template, findings) - granted_capabilities(
        decisions
    )
    if missing:
        return ContentPublishCheck(ok=False, stage="approvals", findings=findings, missing=missing)

    return ContentPublishCheck(ok=True, stage=None, findings=findings)


def require_publishable(
    content_type: ContentType,
    template: ContentTemplate,
    current: RevisionStatus,
    decisions: Iterable[ReviewDecisionRecord] = (),
    findings: Iterable[ContentFinding] = (),
) -> None:
    """Guard the lifecycle half for direct service-level status mutations.

    Content completeness is `check_publishable`'s job; this protects a use case
    that already validated its input from skipping the transition or the
    approval requirement.
    """
    require_transition(current, RevisionStatus.PUBLISHED)
    missing = effective_required_approvals(content_type, template, findings) - granted_capabilities(
        decisions
    )
    if missing:
        names = ", ".join(sorted(capability.value for capability in missing))
        raise MissingApprovalError(
            f"Cannot publish {content_type} on {template}: missing approval from {names}"
        )
