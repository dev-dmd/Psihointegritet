import logging

import structlog
from structlog.typing import EventDict, WrappedLogger

from psihointegritet.core.config import Environment, Settings
from psihointegritet.core.observability import get_correlation_id


def _add_correlation_id(
    _logger: WrappedLogger,
    _method_name: str,
    event_dict: EventDict,
) -> EventDict:
    event_dict["correlation_id"] = get_correlation_id()
    return event_dict


def configure_logging(settings: Settings) -> None:
    """Configure structlog: JSON output in hosted environments, pretty locally."""
    shared_processors: list[structlog.typing.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_correlation_id,
    ]

    renderer: structlog.typing.Processor = (
        structlog.processors.JSONRenderer()
        if settings.environment is not Environment.DEVELOPMENT
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
