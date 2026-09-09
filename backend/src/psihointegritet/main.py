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
from psihointegritet.infrastructure.auth.pdc_session import PdcSessionVerifier
from psihointegritet.infrastructure.auth.unavailable import UnavailableTokenVerifier


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    settings: Settings = app.state.settings
    engine = create_engine(settings)
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    # Mounted here rather than in `create_app` because it needs the session
    # factory, and that needs the engine. Until this line runs the app still
    # carries `UnavailableTokenVerifier`, so a request that somehow arrives
    # before startup finishes is refused rather than crashing on a verifier
    # that is not there.
    app.state.token_verifier = PdcSessionVerifier(app.state.session_factory)
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
    app.state.settings = settings
    # Fail-closed default, replaced by `PdcSessionVerifier` once the lifespan
    # has an engine to read `auth_sessions` with. An app built but never started
    # therefore refuses every bearer token instead of admitting anyone.
    app.state.token_verifier = UnavailableTokenVerifier()

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
