import datetime
import uuid
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

class HistoryService:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        if settings.mongodb_url:
            self.client = AsyncIOMotorClient(
                settings.mongodb_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            self.db = self.client.talentmap
            self.collection = self.db.coach_sessions

    async def create_session(self, user_id: str, title: str = "New Conversation") -> str:
        if self.collection is None:
            return str(uuid.uuid4())
        
        session_id = str(uuid.uuid4())
        session = {
            "_id": session_id,
            "user_id": user_id,
            "title": title,
            "messages": [],
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        }
        await self.collection.insert_one(session)
        return session_id

    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []
        
        cursor = self.collection.find({"user_id": user_id}).sort("updated_at", -1)
        sessions = await cursor.to_list(length=100)
        return sessions

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if self.collection is None:
            return None
        
        return await self.collection.find_one({"_id": session_id})

    async def add_message(self, session_id: str, role: str, content: str):
        if self.collection is None:
            return
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.datetime.utcnow()
        }
        
        await self.collection.update_one(
            {"_id": session_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.datetime.utcnow()}
            }
        )

    async def update_session_title(self, session_id: str, title: str):
        if self.collection is None:
            return
        await self.collection.update_one(
            {"_id": session_id},
            {"$set": {"title": title}}
        )

    async def delete_session(self, session_id: str):
        if self.collection is None:
            return
        await self.collection.delete_one({"_id": session_id})

history_service = HistoryService()
