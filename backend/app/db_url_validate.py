"""Guardrails so Alembic / tooling fail with a clear message instead of DNS errors."""

from __future__ import annotations

import re
from urllib.parse import urlparse


_PLACEHOLDER_MARKERS = (
    "YOUR_PROJECT_REF",
    "YOUR_PASSWORD",
    "your_project_ref",
    "your_password",
    "REPLACE_WITH_PROJECT_REF",
    "REPLACE_WITH_DB_PASSWORD",
)


def database_url_looks_like_template(url: str) -> bool:
    u = url.strip()
    if not u:
        return True
    lowered = u.lower()
    for marker in _PLACEHOLDER_MARKERS:
        if marker.lower() in lowered:
            return True
    # Common copy-paste mistake: brackets left in URI
    if "[password]" in lowered or "[project]" in lowered:
        return True
    return False


def explain_database_url_setup() -> str:
    return (
        "\n"
        "DATABASE_URL still looks like a template (not a real Supabase host).\n\n"
        "Fix:\n"
        "  1. Open Supabase → Project Settings → Database.\n"
        "  2. Copy the connection string (URI) and replace [YOUR-PASSWORD] with your DB password.\n"
        "  3. In backend/.env set DATABASE_URL using the async form, for example:\n"
        "       postgresql+psycopg_async://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres\n"
        "     or the direct host:\n"
        "       postgresql+psycopg_async://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres\n\n"
        "Alembic will convert +psycopg_async → +psycopg for migrations.\n"
        "Do not leave YOUR_PROJECT_REF or YOUR_PASSWORD in the URL.\n"
    )


def assert_database_url_configured(url: str) -> None:
    if database_url_looks_like_template(url):
        raise SystemExit(explain_database_url_setup())
