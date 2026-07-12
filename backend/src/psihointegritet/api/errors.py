from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from psihointegritet.core.logging import get_logger
from psihointegritet.core.observability import get_correlation_id

PROBLEM_CONTENT_TYPE = "application/problem+json"

_log = get_logger(__name__)


class ApiProblem(BaseModel):
    """Stable problem-details envelope; mirrored by the frontend contract."""

    type: str = "about:blank"
    title: str
    status: int
    code: str
    detail: str | None = None
    correlation_id: str = Field(serialization_alias="correlationId")
    field_errors: dict[str, list[str]] | None = Field(
        default=None, serialization_alias="fieldErrors"
    )


def _problem_response(problem: ApiProblem) -> JSONResponse:
    return JSONResponse(
        status_code=problem.status,
        content=problem.model_dump(by_alias=True, exclude_none=True),
        media_type=PROBLEM_CONTENT_TYPE,
    )


async def _handle_http_exception(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)  # noqa: S101 — guarded by registration
    return _problem_response(
        ApiProblem(
            title=str(exc.detail),
            status=exc.status_code,
            code="http_error",
            correlation_id=get_correlation_id(),
        )
    )


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101 — guarded by registration
    field_errors: dict[str, list[str]] = {}
    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"])
        field_errors.setdefault(location, []).append(error["msg"])
    return _problem_response(
        ApiProblem(
            title="Validation failed",
            status=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="validation_error",
            correlation_id=get_correlation_id(),
            field_errors=field_errors,
        )
    )


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    _log.error(
        "unhandled_exception",
        route=request.url.path,
        error_type=type(exc).__name__,
    )
    return _problem_response(
        ApiProblem(
            title="Internal server error",
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="internal_error",
            detail="An unexpected error occurred. Contact support with the correlation ID.",
            correlation_id=get_correlation_id(),
        )
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)
