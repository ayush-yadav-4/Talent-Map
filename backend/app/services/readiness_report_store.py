from __future__ import annotations

import datetime
import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

logger = logging.getLogger(__name__)


class ReadinessReportStore:
    """MongoDB store for latest readiness & mobility report per employee."""

    def __init__(self) -> None:
        self.client: AsyncIOMotorClient | None = None
        self.collection = None
        if settings.mongodb_url:
            self.client = AsyncIOMotorClient(
                settings.mongodb_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            self.collection = self.client.talentmap.employee_readiness_reports

    async def save_latest(self, employee_id: str, org_id: str, payload: dict[str, Any]) -> None:
        """
        Persist only the latest generated readiness report for one employee.
        Upsert replaces any previous report for that employee.
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
        try:
            await self.collection.replace_one({"employee_id": employee_id}, doc, upsert=True)
        except Exception as exc:
            logger.warning("readiness_store.save_latest.failed employee_id=%s err=%s", employee_id, exc)

    async def get_latest(self, employee_id: str) -> dict[str, Any] | None:
        if self.collection is None:
            return None
        try:
            return await self.collection.find_one({"employee_id": employee_id}, {"_id": 0})
        except Exception as exc:
            logger.warning("readiness_store.get_latest.failed employee_id=%s err=%s", employee_id, exc)
            return None

    async def get_org_latest(self, org_id: str) -> list[dict[str, Any]]:
        if self.collection is None:
            return []
        try:
            cursor = self.collection.find({"org_id": org_id}, {"_id": 0})
            return await cursor.to_list(length=10000)
        except Exception as exc:
            logger.warning("readiness_store.get_org_latest.failed org_id=%s err=%s", org_id, exc)
            return []


readiness_report_store = ReadinessReportStore()
