"""Flow lifecycle, publication validation and deterministic answer evaluation."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.compass.models import (
    CompassFlow,
    CompassFlowReviewDecision,
    CompassFlowVersion,
)
from psihointegritet.modules.compass.schemas import (
    CompassFlowDefinition,
    CompassFlowVersionOut,
    FlowEvaluationRequest,
    FlowPreviewOut,
    FlowSelectionOut,
    InputMode,
    OptionSource,
    SelectionTarget,
    TerminalBehavior,
)
from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.modules.content.taxonomy_models import (
    TaxonomyAxis,
    TaxonomyTerm,
    TaxonomyTermRevision,
)
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.shared.domain.publication import (
    ApprovalCapability,
    RevisionStatus,
    require_transition,
)


class CompassFlowError(RuntimeError):
    def __init__(self, code: str, message: str, field_path: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.field_path = field_path


def evaluate_flow(
    definition: CompassFlowDefinition, request: FlowEvaluationRequest
) -> FlowSelectionOut:
    questions = {question.question_id: question for question in definition.questions}
    answers = {answer.question_id: answer.option_ids for answer in request.answers}
    if len(answers) != len(request.answers):
        raise CompassFlowError("COMPASS-FLOW-ANSWER-001", "Pitanje je odgovoreno više puta.")

    topic_group_id: str | None = None
    topic_ids: list[str] = []
    audience_id: str | None = None
    goal_ids: list[str] = []
    journey_intent = None
    starting_package = False
    current_id: str | None = definition.entry_question_id
    visited: set[str] = set()

    while current_id is not None:
        if current_id in visited:
            raise CompassFlowError("COMPASS-FLOW-GRAPH-001", "Tok pitanja sadrži ciklus.")
        visited.add(current_id)
        question = questions[current_id]
        selected = answers.get(current_id, [])
        if len(selected) > question.max_selections:
            raise CompassFlowError(
                "COMPASS-FLOW-ANSWER-002",
                f"Pitanje {current_id} dozvoljava najviše {question.max_selections} izbora.",
                f"answers.{current_id}",
            )
        if question.input_mode is InputMode.SINGLE_SELECT and len(selected) > 1:
            raise CompassFlowError(
                "COMPASS-FLOW-ANSWER-002", "Dozvoljen je samo jedan odgovor.", current_id
            )

        next_id = (
            question.skip_next_question_id if not selected else question.default_next_question_id
        )
        terminal = question.terminal
        values = list(selected)
        if question.option_source is OptionSource.STATIC and selected:
            options = {option.option_id: option for option in question.static_options}
            unknown = [option_id for option_id in selected if option_id not in options]
            if unknown:
                raise CompassFlowError(
                    "COMPASS-FLOW-ANSWER-003", f"Nepoznata opcija: {unknown[0]}", current_id
                )
            chosen = options[selected[0]]
            values = [chosen.selection_value] if chosen.selection_value is not None else []
            next_id = chosen.next_question_id or next_id
            terminal = chosen.terminal or terminal
        elif question.allowed_term_ids:
            unknown = [value for value in selected if value not in question.allowed_term_ids]
            if unknown:
                raise CompassFlowError(
                    "COMPASS-FLOW-ANSWER-003",
                    f"Nedozvoljen taxonomy termin: {unknown[0]}",
                    current_id,
                )

        if values:
            if question.selection_target is SelectionTarget.TOPIC_GROUP:
                topic_group_id = values[0]
            elif question.selection_target is SelectionTarget.TOPICS:
                topic_ids = values[:2]
            elif question.selection_target is SelectionTarget.AUDIENCE:
                audience_id = values[0]
            elif question.selection_target is SelectionTarget.CONTENT_GOALS:
                goal_ids = values
            elif question.selection_target is SelectionTarget.JOURNEY_INTENT:
                from psihointegritet.modules.content.taxonomy_models import JourneyIntent

                try:
                    journey_intent = JourneyIntent(values[0])
                except ValueError as error:
                    raise CompassFlowError(
                        "COMPASS-FLOW-ANSWER-003", "Nepoznat put korisnika.", current_id
                    ) from error

        if terminal is not None:
            starting_package = terminal is TerminalBehavior.STARTING_PACKAGE
            break
        current_id = next_id

    return FlowSelectionOut(
        topic_group_id=topic_group_id,
        topic_ids=topic_ids,
        audience_id=audience_id,
        goal_ids=goal_ids,
        journey_intent=journey_intent,
        starting_package=starting_package
        or not any((topic_group_id, topic_ids, audience_id, goal_ids, journey_intent)),
    )


class CompassFlowService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @staticmethod
    def _out(flow: CompassFlow, version: CompassFlowVersion) -> CompassFlowVersionOut:
        return CompassFlowVersionOut(
            flow_id=flow.id,
            version_id=version.id,
            stable_id=flow.stable_id,
            version=version.version,
            locale=version.locale,
            status=version.status,
            lock_version=version.lock_version,
            definition=CompassFlowDefinition.model_validate(version.definition),
        )

    async def create(
        self,
        actor: StaffActor,
        stable_id: str,
        locale: str,
        definition: CompassFlowDefinition,
    ) -> CompassFlowVersionOut:
        existing = await self._session.scalar(
            select(CompassFlow).where(
                CompassFlow.organization_id == actor.organization_id,
                CompassFlow.stable_id == stable_id,
            )
        )
        if existing is not None:
            raise CompassFlowError("COMPASS-FLOW-409", "Flow stableId već postoji.", "stableId")
        flow = CompassFlow(organization_id=actor.organization_id, stable_id=stable_id)
        self._session.add(flow)
        await self._session.flush()
        version = CompassFlowVersion(
            flow_id=flow.id,
            organization_id=actor.organization_id,
            version=1,
            locale=locale,
            definition=definition.model_dump(by_alias=True, mode="json"),
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(version)
        await self._session.flush()
        return self._out(flow, version)

    async def _owned(
        self, organization_id: UUID, flow_id: UUID, version_id: UUID
    ) -> tuple[CompassFlow, CompassFlowVersion]:
        row = (
            await self._session.execute(
                select(CompassFlow, CompassFlowVersion)
                .join(CompassFlowVersion, CompassFlowVersion.flow_id == CompassFlow.id)
                .where(
                    CompassFlow.id == flow_id,
                    CompassFlow.organization_id == organization_id,
                    CompassFlowVersion.id == version_id,
                    CompassFlowVersion.organization_id == organization_id,
                )
            )
        ).one_or_none()
        if row is None:
            raise CompassFlowError("COMPASS-FLOW-404", "Verzija toka nije pronađena.")
        return row[0], row[1]

    async def update(
        self,
        actor: StaffActor,
        flow_id: UUID,
        version_id: UUID,
        lock_version: int,
        definition: CompassFlowDefinition,
    ) -> CompassFlowVersionOut:
        flow, version = await self._owned(actor.organization_id, flow_id, version_id)
        if version.status is not RevisionStatus.DRAFT:
            raise CompassFlowError("COMPASS-FLOW-STATE-001", "Menja se samo draft verzija.")
        if version.lock_version != lock_version:
            raise CompassFlowError("COMPASS-FLOW-LOCK-001", "Verziju je izmenio drugi korisnik.")
        version.definition = definition.model_dump(by_alias=True, mode="json")
        version.updated_by_user_id = actor.user_id
        await self._session.flush()
        return self._out(flow, version)

    async def review(
        self,
        actor: StaffActor,
        flow_id: UUID,
        version_id: UUID,
        capability: ApprovalCapability,
        outcome: ReviewOutcome,
        note: str | None,
    ) -> CompassFlowVersionOut:
        flow, version = await self._owned(actor.organization_id, flow_id, version_id)
        if version.status is not RevisionStatus.IN_REVIEW:
            raise CompassFlowError("COMPASS-FLOW-STATE-001", "Review pripada in_review verziji.")
        if capability not in {ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}:
            raise CompassFlowError(
                "COMPASS-FLOW-REVIEW-001", "Flow traži Clinical/Business review."
            )
        decision = await self._session.scalar(
            select(CompassFlowReviewDecision).where(
                CompassFlowReviewDecision.flow_version_id == version.id,
                CompassFlowReviewDecision.capability == capability,
            )
        )
        if decision is None:
            decision = CompassFlowReviewDecision(
                flow_version_id=version.id,
                organization_id=actor.organization_id,
                capability=capability,
                outcome=outcome,
                decided_by_user_id=actor.user_id,
                note=note,
            )
            self._session.add(decision)
        else:
            decision.outcome = outcome
            decision.decided_by_user_id = actor.user_id
            decision.note = note
            decision.decided_at = datetime.now(UTC)
        await self._session.flush()
        return self._out(flow, version)

    async def _validate_taxonomy(
        self, organization_id: UUID, locale: str, definition: CompassFlowDefinition
    ) -> None:
        expected: dict[str, TaxonomyAxis] = {}
        for question in definition.questions:
            if question.taxonomy_axis is not None:
                expected.update(dict.fromkeys(question.allowed_term_ids, question.taxonomy_axis))
        for section in definition.result_sections:
            expected.update(dict.fromkeys(section.goal_ids, TaxonomyAxis.CONTENT_GOAL))
        if not expected:
            return
        rows = (
            await self._session.execute(
                select(TaxonomyTerm, TaxonomyTermRevision)
                .join(TaxonomyTermRevision, TaxonomyTermRevision.term_id == TaxonomyTerm.id)
                .where(
                    TaxonomyTerm.stable_id.in_(expected),
                    TaxonomyTermRevision.locale == locale,
                    TaxonomyTermRevision.status == RevisionStatus.PUBLISHED,
                    TaxonomyTermRevision.compass_enabled.is_(True),
                )
            )
        ).all()
        valid = {
            term.stable_id
            for term, revision in rows
            if term.axis is expected[term.stable_id]
            and (term.organization_id is None or term.organization_id == organization_id)
            and (revision.organization_id is None or revision.organization_id == organization_id)
        }
        missing = sorted(set(expected) - valid)
        if missing:
            raise CompassFlowError(
                "COMPASS-FLOW-TAXONOMY-001",
                f"Taxonomy referenca nije objavljena ili aktivna: {missing[0]}",
                "definition",
            )

    async def transition(
        self,
        actor: StaffActor,
        flow_id: UUID,
        version_id: UUID,
        lock_version: int,
        target: RevisionStatus,
    ) -> CompassFlowVersionOut:
        flow, version = await self._owned(actor.organization_id, flow_id, version_id)
        if version.lock_version != lock_version:
            raise CompassFlowError("COMPASS-FLOW-LOCK-001", "Verziju je izmenio drugi korisnik.")
        try:
            require_transition(version.status, target)
        except ValueError as error:
            raise CompassFlowError("COMPASS-FLOW-STATE-001", str(error)) from error
        definition = CompassFlowDefinition.model_validate(version.definition)
        if target in {RevisionStatus.IN_REVIEW, RevisionStatus.APPROVED, RevisionStatus.PUBLISHED}:
            await self._validate_taxonomy(actor.organization_id, version.locale, definition)
        if target is RevisionStatus.APPROVED:
            decisions = (
                await self._session.scalars(
                    select(CompassFlowReviewDecision).where(
                        CompassFlowReviewDecision.flow_version_id == version.id,
                        CompassFlowReviewDecision.outcome == ReviewOutcome.APPROVED,
                    )
                )
            ).all()
            approved = {decision.capability for decision in decisions}
            required = {ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}
            if not required.issubset(approved):
                raise CompassFlowError(
                    "COMPASS-FLOW-REVIEW-002", "Nedostaju Clinical i Business odobrenja."
                )
        now = datetime.now(UTC)
        version.status = target
        version.updated_by_user_id = actor.user_id
        if target is RevisionStatus.PUBLISHED:
            version.published_by_user_id = actor.user_id
            version.published_at = now
        elif target is RevisionStatus.ARCHIVED:
            version.archived_by_user_id = actor.user_id
            version.archived_at = now
        await self._session.flush()
        return self._out(flow, version)

    async def public(
        self, organization_id: UUID, stable_id: str, locale: str
    ) -> CompassFlowVersionOut:
        row = (
            await self._session.execute(
                select(CompassFlow, CompassFlowVersion)
                .join(CompassFlowVersion, CompassFlowVersion.flow_id == CompassFlow.id)
                .where(
                    CompassFlow.organization_id == organization_id,
                    CompassFlow.stable_id == stable_id,
                    CompassFlowVersion.organization_id == organization_id,
                    CompassFlowVersion.locale == locale,
                    CompassFlowVersion.status == RevisionStatus.PUBLISHED,
                )
            )
        ).one_or_none()
        if row is None:
            raise CompassFlowError("COMPASS-FLOW-404", "Objavljeni Kompas tok nije pronađen.")
        return self._out(*row)

    async def list_versions(self, organization_id: UUID) -> list[CompassFlowVersionOut]:
        rows = (
            await self._session.execute(
                select(CompassFlow, CompassFlowVersion)
                .join(CompassFlowVersion, CompassFlowVersion.flow_id == CompassFlow.id)
                .where(
                    CompassFlow.organization_id == organization_id,
                    CompassFlowVersion.organization_id == organization_id,
                )
                .order_by(CompassFlow.stable_id, CompassFlowVersion.version.desc())
            )
        ).all()
        return [self._out(flow, version) for flow, version in rows]

    async def preview(
        self,
        actor: StaffActor,
        flow_id: UUID,
        version_id: UUID,
        request: FlowEvaluationRequest,
    ) -> FlowPreviewOut:
        flow, version = await self._owned(actor.organization_id, flow_id, version_id)
        output = self._out(flow, version)
        return FlowPreviewOut(flow=output, selection=evaluate_flow(output.definition, request))

    async def next_version(
        self, actor: StaffActor, flow_id: UUID, source_version_id: UUID
    ) -> CompassFlowVersionOut:
        flow, source = await self._owned(actor.organization_id, flow_id, source_version_id)
        next_number = await self._session.scalar(
            select(func.max(CompassFlowVersion.version)).where(
                CompassFlowVersion.flow_id == flow.id,
                CompassFlowVersion.locale == source.locale,
            )
        )
        version = CompassFlowVersion(
            flow_id=flow.id,
            organization_id=actor.organization_id,
            version=(next_number or 0) + 1,
            locale=source.locale,
            definition=dict(source.definition),
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(version)
        await self._session.flush()
        return self._out(flow, version)
