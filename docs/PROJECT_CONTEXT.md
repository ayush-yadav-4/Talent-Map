# Talent Map — Project context (SkillRadar SRS)

**Workspace project name:** Talent Map  
**Product name:** SkillRadar — AI-Powered Continuous Skill Gap Analysis Engine  
**Tagline:** “Detect gaps before they become risks”  
**Sectors:** Corporate, Government, Hospital, Manufacturing  

**Document type:** Software Requirements Specification (SRS) — captured from product brief  
**Version:** 1.0.0 — April 2026  
**Classification:** Confidential — Internal Product Documentation  
**Status:** Draft v1 — Approved for Development  

This file preserves the full specification shared in chat so implementation can align with MVP scope, functional requirements, stack, and roadmap. **No implementation work is implied by this document alone.**

---

## Section 1 — Executive overview and product vision

### 1. Executive overview

SkillRadar is a next-generation, AI-powered Skill Gap Analysis Engine designed to continuously detect, measure, and close workforce capability gaps across every employee type — from software engineers and government officers to clinical staff and frontline factory workers. Unlike existing tools that rely on periodic surveys, single data sources, or technical-role-only assessments, SkillRadar operates as a living, always-on intelligence layer over an organization's entire workforce.

### 1.1 Product mission

**Mission statement:** To make every organization's true workforce capability visible in real time — so that no critical skill gap goes undetected, no training budget is wasted on what employees already know, and no employee is ever assessed on what they say rather than what they actually demonstrate.

### 1.2 The problem we solve

- They test only when someone takes a test — skills are never inferred from actual work behavior  
- They focus overwhelmingly on technical roles — the 80% frontline and non-technical workforce is ignored  
- They depend on a single data source — either HRIS records, or LMS completions, or self-assessments — never all three together  
- They are point-in-time snapshots — a survey done today is stale in 90 days with no automatic refresh  
- Government organizations, hospitals, and manufacturing plants have no dedicated tool — they rely on spreadsheets or expensive consulting engagements  
- Enterprise solutions cost $840,000+ per year and are accessible only to companies with 10,000+ employees  

### 1.3 Differentiated solution

| Differentiator | What it means |
|----------------|----------------|
| Multi-source behavioral inference | Skills inferred continuously from actual work (GitHub, Teams, Jira, reviews, machine logs, clinical records, government APARs), not self-claims |
| Universal coverage | One platform for engineers, nurses, government officers, factory workers, retail, admin — sector-appropriate sources |
| AI-powered adaptive testing | CAT + IRT, under 20 questions when behavioral signals are insufficient |
| Living skill profile with time decay | Scores decay as evidence ages; new evidence updates without manual intervention |
| Accessible pricing and deployment | Cloud SaaS; on-prem for government/hospitals; per-employee pricing |

### 1.4 Target market

| Segment | Size |
|---------|------|
| Corporate / IT | 50–5,000 employees |
| Government bodies | 100–50,000 employees |
| Hospitals and clinics | 50–10,000 staff |
| Manufacturing / retail | 100–20,000 workers |

---

## Section 2 — Product scope and objectives

### 2.1 MVP (Phase 1) — in scope (12 weeks)

| Feature | Description |
|---------|-------------|
| Multi-tenant organization management | Orgs, departments, roles, data isolation |
| Employee profile and identity resolution | Email as master key across systems |
| ESCO-based skills ontology | 13,890 ESCO skills in FAISS |
| Role requirement profiles | HR-configurable skills and proficiency thresholds |
| Resume parsing and skill seeding | PDF/DOCX → LLM → profile |
| Performance review LLM extraction | Text → skill evidence + sentiment |
| Multi-source evidence aggregation | Weighted scoring + time decay |
| Skill gap computation engine | vs role requirements, prioritized |
| Adaptive test engine (CAT + IRT) | Max 20 questions, theta-scored |
| Question bank (100+ items) | Five core domains |
| HRIS integration (Merge.dev) | BambooHR, Keka, Darwinbox, Workday |
| Microsoft 365 integration | Teams transcripts + email metadata (Graph) |
| Role-based dashboards | Employee, Manager, HR, Executive |
| Certification expiry tracking | 30 / 60 / 90 day warnings |
| Email notifications | Resend — assessments, gaps, certs |
| JWT auth + Microsoft SSO | NextAuth + Entra ID |

### 2.2 Future scope — Phase 2 and 3 (summary)

GitHub; Jira/ServiceNow; government HRMIS (Manav Sampada, NIC e-HRMS); hospital HIS (HL7 FHIR) + NMC/INC; multilingual assessments; PWA offline; image questions; SJTs; LLM question generation; Slack; Google Workspace; predictive gap forecasting; succession planning; PDF reports; on-prem; cross-org benchmarking; VR assessments; blockchain credentials; AI bias monitoring; federated learning.

### 2.3 Out of scope — MVP

- Payroll processing or payroll system modification  
- ATS / recruitment workflow  
- Performance review authoring (ingest only)  
- Learning content authoring (links only)  
- Patient health record access (staff metadata only)  
- Real-time live meeting analysis (post-meeting transcripts only)  

---

## Section 3 — Stakeholders and user roles

### 3.1 Primary stakeholders (summary)

HR/L&D, department managers, employees, CXOs, government ministry leads, hospital CMO/nursing leadership, IT administrators — each with needs for visibility, compliance, team gaps, or integration control.

### 3.2 Platform RBAC roles

| Role | Permissions summary |
|------|---------------------|
| `super_admin` | Internal team — full platform, org creation, billing, system config |
| `org_admin` | Client admin — org settings, users, integrations, billing |
| `hr_manager` | Full employee data, gaps, assessments, exports |
| `manager` | Own team only |
| `employee` | Own profile, assessments, self-ratings — no colleague data |

---

## Section 4 — Functional requirements

**Priority:** P1 = MVP mandatory, P2 = Phase 2, P3 = Phase 3.

### 4.1 FR-AUTH — Authentication and authorization

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-AUTH-01 | P1 | Email/password registration, bcrypt | Org registers; admin user hashed |
| FR-AUTH-02 | P1 | JWT access 60m + refresh 7d | Returns token pair |
| FR-AUTH-03 | P1 | Microsoft Entra SSO via NextAuth | Login with Microsoft + tenant |
| FR-AUTH-04 | P1 | RBAC on every API | Manager blocked from other dept profiles |
| FR-AUTH-05 | P1 | Audit log all authenticated API calls | audit_logs: actor, IP, time, resource |
| FR-AUTH-06 | P2 | Google Workspace SSO | NextAuth Google |
| FR-AUTH-07 | P2 | SAML 2.0 enterprise SSO | IdP integration |

### 4.2 FR-EMP — Employee management

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-EMP-01 | P1 | Employee CRUD | Soft-delete supported |
| FR-EMP-02 | P1 | Bulk CSV import with mapping | e.g. 500 rows |
| FR-EMP-03 | P1 | Identity alias table | Maps to GitHub, Teams, Jira IDs |
| FR-EMP-04 | P1 | Job title → ESCO occupation | Semantic match |
| FR-EMP-05 | P1 | Org hierarchy dept → team → employee → manager | Manager scope |
| FR-EMP-06 | P1 | Per-source consent flags | Revocable |
| FR-EMP-07 | P1 | Resume PDF/DOCX → async Celery LLM | |
| FR-EMP-08 | P2 | HRIS auto-import Merge webhooks | &lt; 5 min new hire |
| FR-EMP-09 | P2 | Government fields: cadre, grade, service, posting | |
| FR-EMP-10 | P2 | Hospital fields: specialization, NMC/INC reg, cert expiry | |

### 4.3 FR-SKILL — Skills ontology engine

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-SKILL-01 | P1 | ESCO v1.1 in PostgreSQL | uri, name, description, synonyms |
| FR-SKILL-02 | P1 | Embeddings all-MiniLM-L6-v2 → FAISS | Semantic search quality |
| FR-SKILL-03 | P1 | Normalize raw strings to ESCO via cosine similarity | |
| FR-SKILL-04 | P1 | Skill search API top-k, threshold ≥ 0.70 | |
| FR-SKILL-05 | P1 | Tags: domain, sector_tags, bloom_level, is_compliance | |
| FR-SKILL-06 | P1 | Role profile CRUD with min proficiency | |
| FR-SKILL-07 | P2 | Emerging skills from job postings | |
| FR-SKILL-08 | P2 | Auto-calibrate role profiles from top performers | |

### 4.4 FR-EVID — Evidence ingestion and processing

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-EVID-01 | P1 | Resume extraction Claude → structured JSON | skill_name, proficiency_raw, evidence_quote, confidence |
| FR-EVID-02 | P1 | Performance review extraction + sentiment | |
| FR-EVID-03 | P1 | skill_evidence table: source, confidence_weight, observed_at | |
| FR-EVID-04 | P1 | Source-specific weights (e.g. resume 0.30, assessment 0.90) | |
| FR-EVID-05 | P1 | Exponential time decay per source half-life | |
| FR-EVID-06 | P1 | Aggregate to proficiency 1.0–5.0 per employee+skill | |
| FR-EVID-07 | P1 | Flag LLM vs self/manager divergence &gt; 1.0 | |
| FR-EVID-08–13 | P2 | GitHub, Teams, Jira, LMS, APAR OCR, HIS procedure volume | Phase 2 |

### 4.5 FR-GAP — Skill gap computation

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-GAP-01 | P1 | gap = required − current | |
| FR-GAP-02 | P1 | priority = gap × criticality × urgency | |
| FR-GAP-03 | P1 | Urgency: expired cert 2.0; &lt;30d 1.8; &lt;90d 1.5; compliance-mandatory 1.5 | |
| FR-GAP-04 | P1 | Recompute on evidence, role, or profile change (triggered) | |
| FR-GAP-05 | P1 | Gap APIs: individual, team, dept, org | |
| FR-GAP-06 | P1 | Top-5 priority gaps per employee | |
| FR-GAP-07 | P1 | Lifecycle: open → in_progress → closed → waived | |
| FR-GAP-08 | P2 | LMS-linked training recommendations | |
| FR-GAP-09 | P3 | Time-to-close prediction | |

### 4.6 FR-ASSESS — Assessment engine

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-ASSESS-01 | P1 | IRT parameters a, b, c per item | b roughly −3..+3 |
| FR-ASSESS-02 | P1 | CAT selection: Maximum Fisher Information | |
| FR-ASSESS-03 | P1 | Theta update: EAP after each response | |
| FR-ASSESS-04 | P1 | Stop when SE &lt; 0.30 or 20 questions | |
| FR-ASSESS-05 | P1 | Map theta → 1.0–5.0 + named level | |
| FR-ASSESS-06 | P1 | Evidence from assessment weight 0.90 | |
| FR-ASSESS-07 | P1 | Item exposure ≤ 30% of employees | |
| FR-ASSESS-08 | P1 | Same item not repeated for same employee within 12 months | |
| FR-ASSESS-09 | P1 | Anti-gaming flags (&lt;3s responses, uniform timing) | |
| FR-ASSESS-10 | P1 | MCQ, scenario, open-text (MVP) | |
| FR-ASSESS-11 | P1 | Open-text: dual LLM rubric runs; flag if divergence &gt;1 | |
| FR-ASSESS-12–15 | P2 | Image, audio, offline cache, LLM question gen + Bloom mix | |

### 4.7 FR-REPORT — Reporting and dashboards

| FR ID | P | Requirement | Acceptance criteria |
|-------|---|-------------|---------------------|
| FR-REPORT-01 | P1 | Employee dashboard: radar, top-5 gaps, next assessment, recent evidence | |
| FR-REPORT-02 | P1 | Manager: team heatmap, top-3 team gaps, cert alerts | |
| FR-REPORT-03 | P1 | HR: org summary, critical gaps, at-risk depts, training spend | |
| FR-REPORT-04 | P1 | Certification board 30/60/90 color coding | |
| FR-REPORT-05 | P1 | CSV gap export | |
| FR-REPORT-06 | P1 | Email alerts via Resend | |
| FR-REPORT-07 | P2 | PDF ministry-format reports | |
| FR-REPORT-08 | P2 | Power BI / Tableau via REST | |
| FR-REPORT-09 | P3 | Natural-language HR queries | |

---

## Section 5 — Non-functional requirements (summary)

**Performance:** GET p95 &lt; 200ms; score recompute &lt; 2s per employee; FAISS top-10 &lt; 50ms; LLM block &lt; 8s; CAT next question &lt; 300ms; dashboard heatmap &lt; 1s for ≤500 employees; 1000-row CSV import &lt; 60s async.

**Scale:** 100k employees multi-tenant; asyncpg pool ~500; horizontal Celery; FAISS 50k+ nodes; Kafka/SQS for large orgs.

**Security:** AES-256 at rest; TLS 1.3; PII separate from evidence; JWT + RBAC every request; raw comms deleted ≤48h; secrets in env only; rate limits 100/min standard, 500 enterprise.

**Privacy:** DPDP 2023, GDPR, erasure within 30 days cascade, government data residency, hospital staff-only metadata, quarterly parity checks (assessments).

**Reliability:** 99.5% SLA target; DB backups 7d; connector retries; stale sync flagged after 48h; assessment session persisted server-side.

**Usability:** ≤12 min mobile for 20 Q; self-explanatory UI; &lt;2s dashboard on 4G; WCAG 2.1 AA public components; manager email summaries actionable without login.

---

## Section 6 — System architecture and technical stack

**Pattern:** Event-driven microservices within a modular monolith — FastAPI, Celery, Redis, PostgreSQL 16 + pgvector, FAISS (IndexFlatIP).

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 App Router |
| UI | shadcn/ui + Tailwind |
| State | TanStack Query + Zustand |
| Charts | Recharts + D3.js |
| API | Python FastAPI |
| Tasks | Celery + Redis |
| DB | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| LLM | Anthropic Claude Sonnet |
| Embeddings | sentence-transformers all-MiniLM-L6-v2 (384-d, CPU) |
| Vector search | FAISS |
| HRIS | Merge.dev |
| M365 | Microsoft Graph |
| Auth | NextAuth.js + JWT |
| Files | AWS S3 ap-south-1 |
| Email | Resend |
| Deploy | Docker Compose |
| Monitoring | Sentry |
| CI/CD | GitHub Actions |

### 6.3.1 Evidence ingestion flow (summary)

Webhook `/api/v1/webhooks/{source}` or Celery beat → Redis queue → connector → LLM skill_extractor → FAISS ESCO match → `skill_evidence` → gap recompute → notifications.

### 6.3.2 Assessment flow (summary)

`POST /assessments/{id}/sessions` (theta=0, se=1) → `GET .../next-question` (MFI selection) → `POST .../respond` (EAP update) → stop if se &lt; 0.30 or count ≥ 20 → map to proficiency → evidence → scores → gaps.

---

## Section 7 — Skill intelligence engine (key formulas and rules)

**Weighted aggregation (living score):**

`final_score = Σ(proficiency_raw × confidence_weight × e^(-ln(2) × days_elapsed / half_life)) / Σ(confidence_weight × decay_factor)`

**LLM extraction:** Dual-run at temperature 0; flag human review if scores disagree by &gt;1 point. Do not extract PHI, protected attributes, or non-performance personal opinions.

**ESCO + FAISS:** Embed query; top-3; map if sim ≥ 0.70; uncertain 0.55–0.70; &lt;0.55 log as candidate emerging skill. Synonyms before embedding.

**IRT:** 3PL parameters a, b, c; CAT with MFI; EAP theta updates; cold-start: LLM-simulated respondents → pyirt pre-calibration; pilot items; operational at 200 real responses if |Δb| &lt; 0.5.

**Bloom distribution targets (generation):** Remember 10%, Understand 20%, Apply 30%, Analyze 25%, Evaluate/Create 15% with mapped IRT b ranges per SRS.

---

## Section 8 — Integration architecture (phasing)

**Phase 1 corporate:** Merge.dev HRIS; Teams transcripts; Outlook metadata (body only with consent).

**Phase 2+:** SharePoint, GitHub, Jira, Slack, LMS, Google Workspace, Zoom; government SFTP/OCR/APAR/iGOT; hospital FHIR, NMC/INC, hospital LMS.

---

## Section 9 — Roadmap (MVP sprints)

| Sprint | Weeks | Deliverables |
|--------|-------|--------------|
| S1–S2 | 1–2 | Docker, migrations, ESCO seed, FAISS, JWT, Microsoft SSO, RBAC; 15 DB tables; login/logout |
| S3–S4 | 3–4 | Employee CRUD, CSV, hierarchy, role profiles, skill search API, profile UI |
| S5–S6 | 5–6 | Resume + reviews, evidence aggregation, scores, gaps, triggers |
| S7–S8 | 7–8 | CAT/IRT, 100+ questions, session APIs, assessment UI |
| S9–S10 | 9–10 | Dashboards, heatmap, cert alerts, Resend emails |
| S11–S12 | 11–12 | Merge BambooHR, sync logs, integration UI, CSV export, polish |

---

## Section 10 — Data governance (summary)

Minimize retention: cap evidence quotes 200 chars; delete raw comms ≤48h; APAR PDFs ≤24h after OCR/LLM; consent per source with immutable history; DPA before integrations.

---

## Section 11 — Competitive positioning (summary)

SkillRadar positioned on multi-source inference, universal roles, gov/hospital depth, full CAT/IRT, time decay, ESCO+FAISS, India on-prem option, SME pricing, Teams transcripts (Phase 1), Phase 2 LLM item generation and SJTs.

---

## Section 12 — Risks, assumptions, constraints

**Risks:** R01 gov APIs → SFTP adapters; R02 LLM hallucination → dual-run + review queue; R03 monitoring resistance → granular opt-out + assessment-only path; R04 IRT cold start → LLM simulation + pilot; R05 ESCO lag → extension layer + quarterly review; R06–07 competition and breach mitigations as in SRS.

**Assumptions:** Client admin for integrations; gov/hospital IT for SFTP/FHIR/Docker; Claude, Graph transcripts (e.g. Copilot orgs), Merge stability.

**Constraints:** 12-week MVP, 2 developers; **no GPU** — CPU embeddings/inference; gov NIC/on-prem; no patient data in platform; **&lt; 5,000 LLM calls/day** early MVP cap.

---

## Section 13 — Glossary (abbreviated)

ESCO, IRT, CAT, Theta (θ), EAP, Evidence, Time decay, FAISS, APAR, NABH, HL7 FHIR, DPDP Act, Merge.dev, Skill gap, Role profile — definitions as in SRS Section 13.

---

## Section 14 — Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | April 2026 | Product Team | Initial SRS |

---

*End of captured context. Product marketing name in brief: SkillRadar. Repository folder name: Talent Map.*
