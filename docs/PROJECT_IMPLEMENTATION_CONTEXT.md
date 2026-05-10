# TalentMap Implementation Context (Code-As-Built)

Last updated: 2026-05-09  
Purpose: a practical, implementation-focused project brief that another LLM can use to understand the current system without re-scanning the full repository.

---

## 1) System Snapshot

- Monorepo with:
  - `backend/`: FastAPI + SQLAlchemy async + Alembic + Gemini integrations
  - `frontend/`: Next.js 14 App Router + React Query + Tailwind + custom UI
- Data stores:
  - Primary: PostgreSQL (Supabase-compatible), including `pgvector`
  - Optional: MongoDB (coach chat history + latest AI insights cache)
  - Optional: Redis (configured; used as local infra dependency)
- Main product domains implemented:
  - Auth + onboarding (org + employee)
  - Organization structure (departments, role profiles)
  - Employees and skills profile
  - Assessments (adaptive/session flow)
  - Job descriptions and JD-vs-employee gap analysis
  - HR dashboards and readiness views
  - Development plans / IDP generation
  - AI coach chat

---

## 2) Top-Level Repository Map

- `README.md`: setup + architecture summary.
- `docs/PROJECT_CONTEXT.md`: product/SRS context.
- `docs/PROJECT_IMPLEMENTATION_CONTEXT.md`: this file (implementation state).
- `backend/`
  - `app/main.py`: FastAPI entrypoint, router registration, CORS, health routes, static uploads mount.
  - `app/config.py`: environment-driven settings.
  - `app/database.py`: async engine/session + DB URL normalization.
  - `app/models/*`: SQLAlchemy models.
  - `app/routers/*`: API routes.
  - `app/services/*`: scoring, matching, Gemini, CAT, coaching, etc.
  - `app/schemas/*`: pydantic request/response schemas.
  - `alembic/*`: migrations.
  - `run_backend.py`: local uvicorn launcher (defaults to port 8001).
- `frontend/`
  - `app/*`: route pages/layouts.
  - `components/*`: HR/employee/shared UI modules.
  - `lib/api.ts`: axios client + typed API wrappers + token lifecycle.
  - `hooks/useRequireAuth.ts`: auth guard + role gate.
  - `next.config.mjs`: `/api/v1/*` proxy rewrites.

---

## 3) Backend Runtime Architecture

## 3.1 App Boot and Middleware

- FastAPI app created in `backend/app/main.py`.
- Windows event loop policy is explicitly set to selector mode to avoid psycopg async issues.
- CORS:
  - configured from `APP_ALLOWED_ORIGINS`
  - always merged with localhost dev defaults (`3000/3001/3002`).
- Static files:
  - `uploads/resumes` is created at startup
  - served under `/static/uploads`.
- Health checks:
  - `GET /health`
  - `GET /health/db` executes `SELECT 1`.

## 3.2 Configuration

`backend/app/config.py` uses `pydantic-settings` with `.env`:

- Core:
  - `APP_NAME`, `APP_ENV`, `APP_SECRET_KEY`, `APP_ALLOWED_ORIGINS`
- DB:
  - `DATABASE_URL`, pool size/overflow
- Auth:
  - `JWT_SECRET_KEY`, `JWT_ALGORITHM`, access/refresh expiry
- Integrations:
  - `GEMINI_API_KEY` (or alias `GOOGLE_API_KEY`)
  - optional `MONGODB_URL`, `SENTRY_DSN`, SMTP settings

## 3.3 Database Layer

- Async SQLAlchemy engine + session in `backend/app/database.py`.
- URL normalization converts plain `postgresql://` to `postgresql+psycopg_async://`.
- Supabase URLs get `sslmode=require` auto-appended when missing.
- Session dependency commits by default and rolls back on exceptions.
- Alembic sync URL conversion is handled in `backend/alembic/env.py` (`+psycopg_async -> +psycopg`).

---

## 4) Authentication, Authorization, and Session Behavior

## 4.1 Auth Flow

Router: `backend/app/routers/auth.py`

- `POST /api/v1/auth/register`
  - creates Organization + seed Employee + User (`org_admin`)
  - hashes password using passlib context (bcrypt_sha256 + bcrypt fallback).
- `POST /api/v1/auth/login`
  - validates credentials and account status.
- `POST /api/v1/auth/refresh`
  - validates refresh token type and exact token match from DB.
- `POST /api/v1/auth/change-password`
  - requires current password; clears `must_change_password`.
- `GET /api/v1/auth/me`
  - returns current user payload.

## 4.2 Authorization

- `backend/app/deps.py`:
  - bearer token extraction via `HTTPBearer`.
  - token decode + type check (`typ=access`).
  - user lookup + active check.
  - `require_roles(...)` dependency enforces role-based access.

## 4.3 Frontend Session Lifecycle

`frontend/lib/api.ts` + `frontend/hooks/useRequireAuth.ts`:

- Access token stored in `sessionStorage` as `tm_access_token`.
- Refresh token stored as `tm_refresh_token`.
- User snapshot stored as `tm_user`.
- Axios request interceptor appends bearer token.
- Axios response interceptor retries once on 401 using refresh endpoint.
- `useRequireAuth`:
  - validates token via `/auth/me`
  - auto-refreshes if needed
  - enforces `must_change_password` redirect
  - applies role gate and redirect fallback.

---

## 5) Backend Data Model (Current ORM Surface)

Primary model export file: `backend/app/models/__init__.py`.

## 5.1 Organization and People

- `Organization` (`organization.py`)
  - sector/sub-sector, domain, country/state, onboarding step/completion, contact metadata, settings JSON.
- `Department` (`department.py`)
  - org-scoped, parent hierarchy support.
- `Employee` (`employee.py`)
  - rich profile model: role metadata, gov/clinical fields, external handles, consent flags, onboarding, project status.
- `User` (`user.py`)
  - auth identity tied to org + optional employee link, role, password/refresh fields, onboarding state.

## 5.2 Skills / Analytics / Assessments

`analytics.py` contains high-value tables:

- `Skill` (canonical taxonomy record, domain/sub_domain, sector tags, compliance flag, vector embedding)
- `RoleProfile` + `RoleRequiredSkill`
- `EmployeeSkillScore`
- `SkillEvidence`
- `SkillGap`
- `Assessment`, `Question`, `AssessmentSession`, `AssessmentResponse`

## 5.3 Work and Planning

- `Project`, `ProjectAssignment` (`project.py`)
- `JobDescription`, `JDGapAnalysis` (`job_description.py`)
- `DevelopmentPlan`, `DevelopmentMilestone` (`development.py`)
- `PsychometricResult` (`psychometric.py`)
- `IntegrationConfig` (`integration_config.py`)

---

## 6) Backend API Surface by Domain

Base prefixes are registered in `backend/app/main.py`.

## 6.1 Organizations (`/api/v1/organizations`)

Router: `organizations.py`

- org read/update
- onboarding setup steps 2/3/4 + complete
  - step2: departments replace (idempotent)
  - step3: role profiles replace (idempotent)
  - step4: integration config upsert + org settings write
- invite employee (creates employee + user + temporary password + optional SMTP send)
- department CRUD
- role profile CRUD
- project CRUD, assignment CRUD, status patch
- AI recommendations for project staffing (`GeminiService.suggest_team_members`)
- org structure aggregate endpoint

## 6.2 Employees (`/api/v1/employees`)

Router: `employees.py`

- list/create/get/update/delete
- profile endpoints:
  - compact profile
  - full profile (projects + assessments + saved JD gaps + skills + open gaps)
- employee onboarding step1..step4
- bulk import
- self-rating update per skill
- deletion supports force flag when project assignments exist

## 6.3 Skills + Taxonomy (`/api/v1/skills`)

Router: `skills.py`

- `search` placeholder (returns empty)
- role-hint skill inference (`/by-role`)
- taxonomy listing with sector filtering
- taxonomy seed via Gemini (sector-aware)
- manual taxonomy add

## 6.4 Employee Skills (`/api/v1/employee-skills`)

Router: `employee_skills.py`

- resume upload and parse (`pymupdf` preferred, `PyPDF2` fallback)
- AI extraction from resume via Gemini
- bulk save/upsert of employee skills
- AI profile sync (cooldown: once per 24h)
  - stores latest analysis+trajectory in Mongo collection (if configured)
- fetch latest AI sync payload
- on-demand profile analysis endpoint

## 6.5 Assessments (`/api/v1/assessments`)

Router: `assessments.py`

- list my assessments
- start/reuse session
- submit response and update theta/SE
- finalize session on stopping criteria (SE <= 0.30 or >= 20 questions)
- create `SkillEvidence` on completion and trigger recompute
- list score history (`my-scores`)
- generate personalized assessments (fallback question generation)
- generate skill-test assessments (deterministic 20-question set)

## 6.6 Reports (`/api/v1/reports`)

Router: `reports.py`

- HR dashboard stats aggregate
- HR dashboard consolidated payload
- HR gap summary
- HR psychometric distribution
- employee dashboard stats
- readiness scorecard (Gemini-powered manager copilot)

## 6.7 AI Agent Domains

- role intelligence: `/api/v1/agent/role/*`
- matching: `/api/v1/agent/matching/*`
- learning path/courses: `/api/v1/agent/learning/*`
- coach sessions/chat: `/api/v1/agent/coach/*`
- market signals: `/api/v1/agent/market-signals`
- assessment agent: `/api/v1/agent/assessment/*`

## 6.8 Job Descriptions (`/api/v1/job-descriptions`)

- JD CRUD
- analyze employee gap against JD (stores `JDGapAnalysis`)
- list my JD gaps
- list org-wide gaps
- hire-vs-upskill analysis

## 6.9 Psychometrics (`/api/v1/psychometrics`)

- submit DISC/BigFive scores
- latest employee psychometric result
- HR summary list

## 6.10 Development (`/api/v1/development`)

- generate IDP via Gemini
- create/list/get plans
- patch milestone status/outcome/notes

---

## 7) Backend Services and Core Logic

## 7.1 Scoring and Gaps

- `skill_scoring.py`
  - weighted score with time decay:
    - `decay_factor = exp(-ln(2) * days_elapsed / half_life_days)`
  - maps proficiency to level labels
  - includes source confidence constants and half-life maps.
- `gap_analysis.py`
  - priority score formula:
    - `gap_magnitude * criticality_weight * urgency_factor`
  - recompute flow:
    - aggregates evidence -> updates `EmployeeSkillScore`
    - optionally updates `SkillGap` if role profile linkage exists.

## 7.2 CAT / IRT Engine

- `cat_engine.py`
  - 3PL probability and Fisher information
  - EAP theta update using grid approximation
  - item selection by max Fisher information
  - theta <-> proficiency conversion.

## 7.3 Matching and Role Fit

- `matching_service.py`
  - weighted match score by criticality
  - returns both matches and gaps.

## 7.4 Gemini Integration Hub

- `gemini_service.py` includes:
  - resume skill extraction
  - JD extraction + normalization
  - profile analysis
  - learning path/course suggestions
  - assessment generation
  - trajectory prediction
  - taxonomy seed generation
  - market signals
  - psychometric style derivation
  - team recommendation
  - readiness scorecard
  - IDP generation
  - hire-vs-upskill analysis

## 7.5 Coach and History

- `coach_service.py`
  - LangGraph + Gemini chat model with structured system prompt from employee context.
- `history_service.py`
  - Mongo-backed session/message persistence; safe no-op mode if Mongo URL absent.
- `profile_insights_store.py`
  - stores latest AI sync payload per employee (Mongo, upsert).

---

## 8) Database Migration Timeline (Alembic)

Located in `backend/alembic/versions/` (16 files currently).

Main progression themes:

- initial schema setup
- onboarding/profile field expansion
- employee notes and password policy
- projects + bench status
- AI sync timestamps
- project deadline notes + JD references
- job descriptions and JD gap analyses
- skills taxonomy improvements (`sub_domain`, sector tag restoration)
- psychometric tables
- development plans + milestones (and additional `check_in_focus` column)

Notable files include:

- `20260411_0001_initial_schema.py`
- `d722c8739a78_add_skill_cat_and_evidence_tables.py`
- `20260503_0012_psychometric_results.py`
- `c769a6970707_add_development_plans_and_milestones.py`
- `261a61880013_add_check_in_focus_to_development_.py`

---

## 9) Frontend Architecture and Route Layout

## 9.1 Root and Infrastructure

- Root layout: `frontend/app/layout.tsx`
  - global font, theme provider, global providers wrapper.
- Scoped query provider:
  - React Query loaded under `/hr` and `/employee` layouts only.
- API proxy:
  - Next rewrite forwards `/api/v1/*` to backend target.
  - default proxy target in `next.config.mjs` is `http://127.0.0.1:8001`.

## 9.2 Route Groups

- Public:
  - `/` marketing landing
  - `/onboarding` (org registration)
  - `/login` (admin/hr/manager)
  - `/employee/login`
  - `/change-password`
- HR app:
  - `/hr/dashboard`
  - `/hr/employees`, `/hr/employees/[id]`
  - `/hr/organization`
  - `/hr/projects*`
  - `/hr/job-descriptions`
  - `/hr/skill-intelligence`
  - `/hr/skill-gaps`
  - `/hr/psychometrics`
  - `/hr/readiness`
  - `/hr/settings`
  - `/hr/onboarding/*`
- Employee app:
  - `/employee/dashboard`
  - `/employee/skills`
  - `/employee/projects*`
  - `/employee/job-descriptions`
  - `/employee/assessments*`
  - `/employee/scores`
  - `/employee/course-suggestions`
  - `/employee/development`
  - `/employee/coach`
  - `/employee/settings`
  - `/employee/onboarding/*`

## 9.3 Layout Components

- `components/hr/HrAppLayout.tsx`
  - sidebar nav + org structure quick panel + signout.
- `components/employee/EmployeeAppLayout.tsx`
  - role-specific nav + org identity + signout.

---

## 10) Frontend Feature Modules (As Implemented)

## 10.1 HR Dashboard + Intelligence

- `hr/dashboard/page.tsx`
  - consumes HR dashboard aggregate APIs
  - includes:
    - role intelligence panel
    - matching dashboard
    - market intel panel
    - top gaps + cert alerts + departmental chart.
- `hr/skill-intelligence/page.tsx`
  - wraps `SkillTaxonomyManager`, `MarketIntelPanel`, `GapSummaryTable`.

## 10.2 HR Organization and Workforce Management

- `hr/organization/page.tsx`
  - structure editing: departments + roles + org metadata.
- `hr/employees/page.tsx` and `hr/employees/[id]/page.tsx`
  - employee list + delete flows + detailed profile view.
- `hr/projects*`
  - project lifecycle + assignment management + AI team recommendation.

## 10.3 HR Advanced Decision Support

- `hr/job-descriptions/page.tsx`
  - JD create/edit/delete with AI extraction workflow.
- `hr/skill-gaps/page.tsx`
  - lists JD gap analyses
  - triggers hire-vs-upskill AI decision per gap.
- `hr/readiness/page.tsx`
  - manager copilot view for readiness scorecards.
- `hr/psychometrics/page.tsx`
  - trait distribution + manual DISC/BigFive submission.

## 10.4 Employee Workspace

- `employee/dashboard/page.tsx`
  - consolidated personal KPIs, projects, top gaps, saved JD analyses
  - includes AI sync action.
- `employee/skills/page.tsx`
  - resume upload extraction, manual skill batch entry, save-to-profile, AI profile analysis.
- `employee/assessments*`
  - generate assessments/tests, start/resume sessions, results flow.
- `employee/job-descriptions/page.tsx`
  - browse JDs and run personal gap analysis.
- `employee/development/page.tsx`
  - generate and persist AI IDP, update milestones.
- `employee/coach/page.tsx`
  - full chat session UI with history management.

---

## 11) End-to-End Data Flows

## 11.1 Resume -> Skills

1. user uploads file via frontend  
2. backend parses text (`pymupdf`/`PyPDF2`)  
3. Gemini extracts skills  
4. user confirms bulk save  
5. `Skill` and `EmployeeSkillScore` updated/upserted.

## 11.2 Assessment -> Evidence -> Score

1. assessment generated (fallback question builders currently emphasized)  
2. session started/reused  
3. response submissions update theta/SE  
4. completion creates `SkillEvidence`  
5. recompute pipeline updates score/gaps.

## 11.3 JD Gap + HR Strategic Decisions

1. HR creates JD (AI structures skill requirements)  
2. employee runs `analyze-gap`  
3. result persisted in `JDGapAnalysis`  
4. HR reviews org-wide gap table  
5. optional hire-vs-upskill AI analysis.

## 11.4 AI Sync + Trajectory

1. employee triggers sync endpoint (24h cooldown)  
2. backend computes profile analysis + trajectory  
3. latest payload stored in Mongo (if enabled)  
4. employee dashboard/components read cached payload.

---

## 12) Environment and Deployment Notes

## 12.1 Backend `.env` Expectations

- Required minimum:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - `APP_SECRET_KEY`
- AI features require:
  - `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- Optional:
  - `MONGODB_URL` (coach + profile insights persistence)
  - SMTP variables for invite emails.

## 12.2 Frontend `.env`

- `NEXT_PUBLIC_APP_URL` for app origin.
- typically omit `NEXT_PUBLIC_API_URL` in dev and use rewrite proxy.
- optional:
  - `API_PROXY_TARGET`
  - `INTERNAL_API_URL` for server-side fetches.

---

## 13) Testing and CI Status

- No dedicated test directories or test files were found.
- No GitHub Actions workflow files were found.
- Current validation style is runtime/manual through UI and API behavior.

---

## 14) Known Implementation Realities and Caveats

- AI-heavy endpoints rely on Gemini availability and schema compliance.
- Some router flows include explicit `db.commit()` while global DB dependency also commits; behavior is generally safe but inconsistent in style.
- Duplicate path anomalies exist in git status with backslash-style file paths (Windows path artifacts), e.g.:
  - `backend\app\services\gemini_service.py`
  - `backend\app\routers\job_descriptions.py`
  - `frontend\app\hr\skill-gaps\page.tsx`
- `skills/search` endpoint is currently a placeholder returning empty list.
- `seed_skills_from_declared` is currently a stub.
- Mongo-backed features gracefully degrade when `MONGODB_URL` is missing.

---

## 15) LLM Handoff Guidance

If another LLM should continue implementation, provide this context plus:

- target branch and desired feature/bug scope
- current `.env.example` references (do not share secrets)
- key entrypoints:
  - backend: `backend/app/main.py`
  - frontend API client: `frontend/lib/api.ts`
  - main HR page: `frontend/app/hr/dashboard/page.tsx`
  - main employee page: `frontend/app/employee/dashboard/page.tsx`

Recommended initial interpretation for another model:

- treat this project as a modular monolith with domain routers and service-level AI orchestration
- assume skill intelligence and JD gap workflows are central product value
- verify path anomalies before mass refactors
- add test coverage around auth, assessment session transitions, and JD analysis persistence first.

