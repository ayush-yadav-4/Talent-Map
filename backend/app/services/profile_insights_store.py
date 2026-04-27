from __future__ import annotations

import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings


class ProfileInsightsStore:
    """MongoDB store for latest employee profile analysis output."""

    def __init__(self) -> None:
        self.client: AsyncIOMotorClient | None = None
        self.collection = None
        if settings.mongodb_url:
            self.client = AsyncIOMotorClient(
                settings.mongodb_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            self.collection = self.client.talentmap.employee_profile_insights

    async def save_latest(self, employee_id: str, org_id: str, payload: dict[str, Any]) -> None:
        """
        Store latest analysis output per employee.
        Previous output is replaced atomically by upsert.
        """
        if self.collection is None:
            return

        now = datetime.datetime.utcnow()
        doc = {
            "employee_id": employee_id,
            "org_id": org_id,
            "payload": payload,
            "updated_at": now,
        }
        await self.collection.replace_one(
            {"employee_id": employee_id},
            doc,
            upsert=True,
        )

    async def get_latest(self, employee_id: str) -> dict[str, Any] | None:
        if self.collection is None:
            return None
        return await self.collection.find_one({"employee_id": employee_id}, {"_id": 0})


profile_insights_store = ProfileInsightsStore()
