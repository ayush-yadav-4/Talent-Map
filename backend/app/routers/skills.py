from __future__ import annotations

import re
from typing import Iterable

from fastapi import APIRouter, Query

router = APIRouter()


def _infer_skills_from_title(title: str) -> list[dict[str, str]]:
    t = title.lower()
    out: list[tuple[str, str]] = []
    rules: Iterable[tuple[str, list[str]]] = (
        ("engineer", ["Python", "SQL", "Git", "API design", "Testing"]),
        ("developer", ["JavaScript", "TypeScript", "Git", "CI/CD", "Debugging"]),
        ("data", ["SQL", "Python", "Data analysis", "Statistics", "Visualization"]),
        ("product", ["Roadmapping", "User research", "Stakeholder management", "Analytics", "Prioritization"]),
        ("nurse", ["Patient care", "Clinical documentation", "Medication administration", "Triage", "Infection control"]),
        ("doctor", ["Clinical diagnosis", "Patient assessment", "Evidence-based medicine", "Documentation", "Communication"]),
        ("manager", ["People leadership", "Planning", "Budgeting", "Stakeholder communication", "Performance management"]),
        ("sales", ["Prospecting", "Negotiation", "CRM", "Presentation", "Pipeline management"]),
        ("hr", ["Talent acquisition", "Employee relations", "Payroll basics", "Policy", "Coaching"]),
    )
    for needle, skills in rules:
        if needle in t:
            out = [(s, "inferred") for s in skills]
            break
    if not out:
        out = [("Communication", "general"), ("Problem solving", "general"), ("Collaboration", "general"), ("Documentation", "general"), ("Domain knowledge", "general")]
    return [{"name": name, "domain": domain} for name, domain in out[:5]]


@router.get("/search")
async def search_skills(q: str = Query("", max_length=200)) -> list[dict]:
    """Placeholder — wire to ESCO / vector search when indexed."""
    _ = q
    return []


@router.get("/by-role")
async def skills_by_role(title: str = Query("", max_length=255)) -> list[dict]:
    """Lightweight title → skill hints until ESCO + FAISS is wired."""
    cleaned = re.sub(r"\s+", " ", title).strip()
    if not cleaned:
        return []
    return _infer_skills_from_title(cleaned)
