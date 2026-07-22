from fastapi import APIRouter

from psihointegritet.api.v1 import health
from psihointegritet.modules.guidance.router import public_router, team_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router)
api_v1_router.include_router(public_router)
api_v1_router.include_router(team_router)
