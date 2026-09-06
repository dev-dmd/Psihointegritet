from typing import cast

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from psihointegritet.core.logging import get_logger

PROBLEM_CONTENT_TYPE = "application/problem+json"

_log = get_logger(__name__)


SafeParam = str | int | float | bool


class ApiFieldError(BaseModel):
    code: str
    params: dict[str, SafeParam] | None = None


class ApiProblem(BaseModel):
    """Stable problem-details envelope; mirrored by the frontend contract."""

    type: str = "about:blank"
    status: int
    code: str
    params: dict[str, SafeParam] | None = None
    field_path: str | None = Field(default=None, serialization_alias="fieldPath")
    field_errors: dict[str, list[ApiFieldError]] | None = Field(
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
    detail = exc.detail
    if isinstance(detail, dict):
        payload = cast(dict[str, object], detail)
        code = str(payload.get("code") or "http_error")
        raw_params = payload.get("params")
        params = (
            {
                str(key): value
                for key, value in cast(dict[object, object], raw_params).items()
                if isinstance(value, str | int | float | bool)
            }
            if isinstance(raw_params, dict)
            else None
        )
        field_path_raw = payload.get("fieldPath") or payload.get("field_path")
        field_path = str(field_path_raw) if field_path_raw is not None else None
    else:
        code = "http_error"
        params = None
        field_path = None
    return _problem_response(
        ApiProblem(
            status=exc.status_code,
            code=code,
            params=params,
            field_path=field_path,
        )
    )


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101 — guarded by registration
    field_errors: dict[str, list[ApiFieldError]] = {}
    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"])
        field_errors.setdefault(location, []).append(ApiFieldError(code=str(error["type"])))
    return _problem_response(
        ApiProblem(
            status=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="validation_error",
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
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="internal_error",
        )
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)
