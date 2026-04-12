# Talent Map (Skill Gap Engine)

Monorepo: **Next.js 14** frontend, **FastAPI** backend, **Supabase** (PostgreSQL + pgvector) for data, **Redis** for queues/cache (local via Docker).

## Prerequisites

- Node.js 20+
- **Python 3.12 or 3.13** (recommended). Avoid 3.14+ for now on Windows unless you have Rust + MSVC build tools — `pydantic-core` wheels may be missing.
- [Supabase](https://supabase.com) project (free tier is fine)
- Docker (optional, for local Redis only)

## Supabase setup (database)

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In **SQL Editor**, run:

   ```sql
   create extension if not exists vector;
   ```

3. Copy connection strings from **Project Settings → Database**:
   - **URI** (session or direct, port `5432`) for migrations and server connections.
   - Use the **database password** you set when creating the project.

4. Build your `DATABASE_URL` for the Python app (async):

   `postgresql+psycopg_async://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

   This project uses **psycopg v3** (`postgresql+psycopg_async://`) for the FastAPI app. **Alembic** uses the same credentials but connects with the **sync** driver (`postgresql+psycopg://`) so `alembic upgrade head` works on Windows (avoids `ProactorEventLoop` + async psycopg issues). You can paste a `postgresql://` URI from the Supabase dashboard; the app normalizes it to `+psycopg_async`.

## Environment files

1. Copy `backend/.env.example` → `backend/.env` and fill values (at minimum `DATABASE_URL`, `JWT_SECRET_KEY`, `APP_SECRET_KEY`).
2. Copy `frontend/.env.example` → `frontend/.env.local`.

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

## Redis (local)

```bash
docker compose up -d redis
```

Set `REDIS_URL=redis://localhost:6379/0` in `backend/.env`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## First user / org

Use the API:

- `POST /api/v1/auth/register` — creates an organization and `org_admin` user.

See `docs/PROJECT_CONTEXT.md` for full product SRS.
