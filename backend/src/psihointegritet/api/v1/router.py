from fastapi import APIRouter

from psihointegritet.api.v1 import health
from psihointegritet.modules.content.router import router as content_router
from psihointegritet.modules.guidance.router import public_router, team_router
from psihointegritet.modules.privacy.router import public_router as privacy_public_router
from psihointegritet.modules.privacy.router import router as privacy_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router)
api_v1_router.include_router(public_router)
api_v1_router.include_router(team_router)
api_v1_router.include_router(privacy_router)
api_v1_router.include_router(privacy_public_router)
api_v1_router.include_router(content_router)
