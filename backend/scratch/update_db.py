import asyncio
import sys
from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Adding years_of_experience to employee_skill_scores...")
        await conn.execute(text('ALTER TABLE employee_skill_scores ADD COLUMN IF NOT EXISTS years_of_experience FLOAT'))
        await conn.commit()
        print("Done.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
