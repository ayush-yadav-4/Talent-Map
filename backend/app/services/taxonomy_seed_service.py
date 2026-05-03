"""Sector-aware skill taxonomy domain presets (non-IT first)."""

from __future__ import annotations

# Domains used when prompting Gemini to seed skills per sector.
SECTOR_SKILL_DOMAINS: dict[str, list[str]] = {
    "government": [
        "Administration",
        "Finance & Accounts",
        "Legal",
        "IT",
        "Procurement",
        "Compliance",
    ],
    "hospital": [
        "Clinical",
        "Nursing",
        "Pharmacy",
        "Radiology",
        "Administration",
        "Infection Control",
    ],
    "manufacturing": [
        "Production",
        "Safety & EHS",
        "Quality",
        "Maintenance",
        "Supply Chain",
    ],
    "retail": [
        "Sales",
        "Customer Service",
        "Inventory",
        "Operations",
    ],
    "corporate": [
        "Engineering",
        "Product",
        "Data & Analytics",
        "Security",
        "HR & People",
        "Finance",
        "Operations",
    ],
}


def normalize_sector(sector: str | None) -> str:
    s = (sector or "corporate").strip().lower()
    if s in SECTOR_SKILL_DOMAINS:
        return s
    return "corporate"


def domains_for_sector(sector: str | None) -> list[str]:
    return SECTOR_SKILL_DOMAINS.get(normalize_sector(sector), SECTOR_SKILL_DOMAINS["corporate"])
