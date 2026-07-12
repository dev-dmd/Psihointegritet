from fastapi import APIRouter

from psihointegritet.api.v1 import health

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router)
