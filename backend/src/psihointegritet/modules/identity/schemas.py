"""Small identity read models shared by staff-facing APIs."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ActorSummaryOut(BaseModel):
    """Stable audit identity plus the human label shown in the panel."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    user_id: UUID
    display_name: str
    is_superadmin: bool
