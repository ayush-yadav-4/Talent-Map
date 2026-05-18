import asyncio
import os
import sys
import warnings
from pathlib import Path

import uvicorn

BACKEND_ROOT = Path(__file__).resolve().parent

# Langchain still imports pydantic v1 shims; harmless on Python 3.14 but noisy on every reload.
warnings.filterwarnings(
    "ignore",
    message="Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.",
    category=UserWarning,
)


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def main() -> None:
    if sys.platform.startswith("win"):
        # psycopg async on Windows requires selector event loop policy.
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8001"))
    is_dev = os.getenv("APP_ENV", "development").strip().lower() == "development"

    # Hot reload on Windows is prone to overlapping worker restarts (KeyboardInterrupt noise).
    # Default OFF on Windows; set BACKEND_RELOAD=true in .env when you want it.
    if sys.platform.startswith("win"):
        default_reload = False
    else:
        default_reload = is_dev

    reload_enabled = _bool_env("BACKEND_RELOAD", default_reload)
    reload_delay = float(os.getenv("BACKEND_RELOAD_DELAY", "2.0" if sys.platform.startswith("win") else "0.25"))

    uvicorn_kwargs: dict[str, object] = {
        "host": host,
        "port": port,
        "reload": reload_enabled,
    }
    if reload_enabled:
        uvicorn_kwargs["reload_delay"] = reload_delay
        # Only watch application code — avoids reload storms from temp/test files at repo root.
        uvicorn_kwargs["reload_dirs"] = [str(BACKEND_ROOT / "app")]
        uvicorn_kwargs["reload_excludes"] = [
            "**/__pycache__/**",
            "**/*.pyc",
            "**/.venv/**",
            "**/_test_*.py",
            "**/test_*.py",
        ]

    if reload_enabled and sys.platform.startswith("win"):
        print(
            "Backend hot reload is ON (Windows). If you see KeyboardInterrupt traces, "
            "set BACKEND_RELOAD=false in backend/.env and restart once.",
            flush=True,
        )

    uvicorn.run("app.main:app", **uvicorn_kwargs)


if __name__ == "__main__":
    main()
