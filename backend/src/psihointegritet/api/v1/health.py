from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str


@router.get("/health", operation_id="get_api_v1_health")
async def get_health() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")
