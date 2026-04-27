import asyncio
import sys
from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Altering skills table to support 768-dim embeddings...")
        # Check if vector extension exists
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        
        # Drop old column if it exists with wrong size, or just add/alter
        # Simplified: Drop and recreate for this dev environment
        await conn.execute(text('ALTER TABLE skills DROP COLUMN IF EXISTS embedding'))
        await conn.execute(text('ALTER TABLE skills ADD COLUMN embedding vector(768)'))
        
        await conn.commit()
        print("Done.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
