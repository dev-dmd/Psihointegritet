FROM python:3.14.6-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# TODO: pin the uv image digest before the first production deploy.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN uv sync --locked --no-dev

FROM python:3.14.6-slim AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN useradd --create-home --uid 10001 appuser
COPY --from=builder --chown=appuser:appuser /app /app

USER appuser
EXPOSE 8000

CMD ["uvicorn", "psihointegritet.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
