from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from psihointegritet.api.errors import register_error_handlers
from psihointegritet.api.v1.health import HealthResponse
from psihointegritet.api.v1.router import api_v1_router
from psihointegritet.core.config import Settings, get_settings
from psihointegritet.core.logging import configure_logging, get_logger
from psihointegritet.core.observability import CorrelationIdMiddleware
from psihointegritet.db.session import create_engine, create_session_factory


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    settings = get_settings()
    engine = create_engine(settings)
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    get_logger(__name__).info("application_started", environment=settings.environment)
    yield
    await engine.dispose()


root_router = APIRouter()


@root_router.get("/health", tags=["health"], operation_id="get_health")
async def get_root_health() -> HealthResponse:
    """Infrastructure-level liveness probe (Railway/Docker healthcheck)."""
    return HealthResponse(status="ok", version="0.1.0")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    app = FastAPI(
        title="Psihointegritet API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
    )

    register_error_handlers(app)
    app.include_router(root_router)
    app.include_router(api_v1_router)

    return app


app = create_app()
