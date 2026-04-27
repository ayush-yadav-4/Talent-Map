from datetime import datetime, timezone
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analytics import (
    Assessment,
    AssessmentSession,
    AssessmentResponse,
    Question,
    SkillEvidence,
    EmployeeSkillScore,
    Skill
)
from app.schemas.assessment import (
    SessionStartRequest,
    SessionResponse,
    AnswerSubmitRequest,
    SessionResultSchema,
    QuestionSchema
)
from app.services.cat_engine import (
    select_next_item,
    update_theta_eap,
    theta_to_proficiency,
    proficiency_to_theta
)
from app.services.skill_scoring import CONFIDENCE_WEIGHTS, HALF_LIFE_DAYS

from app.deps import get_current_user
from app.models.user import User

router = APIRouter()

SKILL_TEST_TITLE_PREFIX = "Skill Test - "
CURRENT_ASSESSMENT_TITLE_PREFIX = "Personalized Skills Assessment - "


def _assessment_type_from_title(title: str) -> str:
    if title.startswith(SKILL_TEST_TITLE_PREFIX):
        return "skill_test"
    return "current_assessment"


def _assessment_question_scope(assessment_id: uuid.UUID) -> str:
    return f"assessment:{assessment_id}"


@router.get("/mine", response_model=list[dict])
async def list_my_assessments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee_id = current_user.employee_id
    if not employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")

    result = await db.execute(
        select(Assessment)
        .where(Assessment.org_id == current_user.org_id)
        .order_by(Assessment.title.asc())
    )
    assessments = result.scalars().all()

    sessions_result = await db.execute(
        select(AssessmentSession)
        .where(AssessmentSession.employee_id == employee_id)
        .order_by(AssessmentSession.started_at.desc())
    )
    sessions = sessions_result.scalars().all()
    latest_by_assessment: dict[uuid.UUID, AssessmentSession] = {}
    for session in sessions:
        if session.assessment_id not in latest_by_assessment:
            latest_by_assessment[session.assessment_id] = session

    skill_names_res = await db.execute(
        select(Skill.canonical_name)
        .join(EmployeeSkillScore, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == employee_id)
        .order_by(Skill.canonical_name.asc())
    )
    employee_skill_names = [row[0] for row in skill_names_res.all()]

    payload: list[dict] = []
    for assessment in assessments:
        latest_session = latest_by_assessment.get(assessment.id)
        status = "available"
        if latest_session:
            status = latest_session.status or "available"
        payload.append(
            {
                "id": str(assessment.id),
                "title": assessment.title,
                "description": "Personalized assessment generated for your current skill profile.",
                "estimated_time": "~20 mins",
                "is_mandatory": False,
                "status": status,
                "skills": employee_skill_names[:5],
                "difficulty": "Adaptive",
                "assessment_type": _assessment_type_from_title(assessment.title),
            }
        )
    return payload


async def _get_employee_skill_ids(db: AsyncSession, employee_id: uuid.UUID) -> list[uuid.UUID]:
    skill_res = await db.execute(
        select(EmployeeSkillScore.skill_id).where(EmployeeSkillScore.employee_id == employee_id)
    )
    return [row[0] for row in skill_res.all()]

@router.post("/sessions", response_model=SessionResponse)
async def start_session(
    req: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    employee_id = current_user.employee_id
    if not employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")
    # Check for existing assessment
    assessment = await db.get(Assessment, req.assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="You are not allowed to start this assessment")

    employee_skill_ids = await _get_employee_skill_ids(db, employee_id)
    if not employee_skill_ids:
        raise HTTPException(
            status_code=400,
            detail="No skills found in your profile. Add skills before starting an assessment.",
        )

    # Reuse an existing in-progress session for this employee + assessment.
    existing_res = await db.execute(
        select(AssessmentSession)
        .where(
            AssessmentSession.assessment_id == req.assessment_id,
            AssessmentSession.employee_id == employee_id,
            AssessmentSession.status == "in_progress",
        )
        .order_by(AssessmentSession.started_at.desc())
    )
    existing_session = existing_res.scalars().first()
    if existing_session:
        assessment_scope = _assessment_question_scope(req.assessment_id)
        questions_query = select(Question).where(
            Question.calibration_status == "operational",
            Question.skill_id.in_(employee_skill_ids),
            Question.sector == assessment_scope,
        )
        result = await db.execute(questions_query)
        all_questions = result.scalars().all()
        if not all_questions:
            # Backward-compatible fallback for older assessments created before scoping.
            fallback_query = select(Question).where(
                Question.calibration_status == "operational",
                Question.skill_id.in_(employee_skill_ids),
            )
            fallback_result = await db.execute(fallback_query)
            all_questions = fallback_result.scalars().all()
        seen = set(existing_session.administered_question_ids or [])
        remaining = [q for q in all_questions if q.id not in seen]
        candidates = [{"id": q.id, "a": q.a_param, "b": q.b_param, "c": q.c_param} for q in remaining]
        next_question_id = select_next_item(existing_session.current_theta, candidates) if candidates else None
        next_q = next((q for q in remaining if q.id == next_question_id), None) if next_question_id else None
        return SessionResponse(
            id=existing_session.id,
            status=existing_session.status,
            current_theta=existing_session.current_theta,
            current_se=existing_session.current_se,
            questions_served=existing_session.questions_served,
            started_at=existing_session.started_at,
            next_question=QuestionSchema(
                id=next_q.id,
                question_text=next_q.question_text,
                question_type=next_q.question_type,
                options=next_q.options,
                bloom_level=next_q.bloom_level,
                sector=next_q.sector,
            ) if next_q else None,
        )

    # Initialize session
    # Warm start if employee has prior score
    # For now, start at 0.0
    new_session = AssessmentSession(
        assessment_id=req.assessment_id,
        employee_id=employee_id,
        status="in_progress",
        current_theta=0.0,
        current_se=1.0,
        questions_served=0,
        administered_question_ids=[],
        started_at=datetime.now(timezone.utc),
    )
    db.add(new_session)
    await db.flush()
    
    # Get first question
    # Find eligible items for the assessment's skills
    # (Simplified: assume assessment has a way to find relevant questions)
    # Getting all operational questions for now
    assessment_scope = _assessment_question_scope(req.assessment_id)
    questions_query = select(Question).where(
        Question.calibration_status == "operational",
        Question.skill_id.in_(employee_skill_ids),
        Question.sector == assessment_scope,
    )
    result = await db.execute(questions_query)
    all_questions = result.scalars().all()
    if not all_questions:
        # Backward-compatible fallback for older assessments created before scoping.
        fallback_query = select(Question).where(
            Question.calibration_status == "operational",
            Question.skill_id.in_(employee_skill_ids),
        )
        fallback_result = await db.execute(fallback_query)
        all_questions = fallback_result.scalars().all()
    
    candidates = [
        {"id": q.id, "a": q.a_param, "b": q.b_param, "c": q.c_param}
        for q in all_questions
    ]
    
    next_question_id = select_next_item(new_session.current_theta, candidates)
    next_q = None
    if next_question_id:
        next_q = next(q for q in all_questions if q.id == next_question_id)

    return SessionResponse(
        id=new_session.id,
        status=new_session.status,
        current_theta=new_session.current_theta,
        current_se=new_session.current_se,
        questions_served=new_session.questions_served,
        started_at=new_session.started_at,
        next_question=QuestionSchema(
            id=next_q.id,
            question_text=next_q.question_text,
            question_type=next_q.question_type,
            options=next_q.options,
            bloom_level=next_q.bloom_level,
            sector=next_q.sector
        ) if next_q else None
    )

@router.post("/sessions/{session_id}/respond", response_model=SessionResponse)
async def submit_answer(
    session_id: uuid.UUID,
    answer: AnswerSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await db.get(AssessmentSession, session_id)
    if not session or session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Invalid session")
    if session.employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="You are not allowed to answer this session")

    question = await db.get(Question, answer.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = False
    if question.question_type == "mcq":
        is_correct = answer.selected_option_id == question.correct_answer_id
    # Add other types here (SJT, Open Text with Gemini)

    # Save response
    response = AssessmentResponse(
        session_id=session_id,
        question_id=answer.question_id,
        selected_option_id=answer.selected_option_id,
        open_text_response=answer.open_text_response,
        is_correct=is_correct,
        response_time_seconds=answer.response_time_seconds,
        theta_before=session.current_theta,
        se_before=session.current_se
    )
    db.add(response)
    
    # Update CAT state
    # Get all responses for EAP
    responses_query = select(AssessmentResponse, Question).join(Question).where(AssessmentResponse.session_id == session_id)
    res = await db.execute(responses_query)
    history = res.all()
    
    cat_history = [
        (r.AssessmentResponse.is_correct, r.Question.a_param, r.Question.b_param, r.Question.c_param)
        for r in history
    ]
    # Add current response if not in history yet
    cat_history.append((is_correct, question.a_param, question.b_param, question.c_param))
    
    new_theta, new_se = update_theta_eap(cat_history)
    
    response.theta_after = new_theta
    response.se_after = new_se
    
    session.current_theta = new_theta
    session.current_se = new_se
    session.questions_served += 1
    session.administered_question_ids = list(session.administered_question_ids) + [question.id]
    
    # Check stopping criteria
    if new_se <= 0.30 or session.questions_served >= 20:
        session.status = "completed"
        session.completed_at = datetime.now(timezone.utc)
        session.final_proficiency = theta_to_proficiency(new_theta)
        session.final_se = new_se
        
        # Create Evidence Record
        evidence = SkillEvidence(
            employee_id=session.employee_id,
            skill_id=question.skill_id,
            source_type="assessment",
            proficiency_raw=session.final_proficiency,
            confidence_weight=CONFIDENCE_WEIGHTS["assessment"],
            decay_half_life_days=HALF_LIFE_DAYS["assessment"],
            evidence_snippet=f"IRT adaptive assessment — {session.questions_served} questions, SE={new_se:.2f}",
            # DB currently enforces NOT NULL on observed_at; set explicitly.
            observed_at=datetime.now(timezone.utc),
        )
        db.add(evidence)
        await db.flush()
        
        # Recompute score trigger
        from app.services.gap_analysis import GapAnalysisService
        await GapAnalysisService.recompute_employee_skills(session.employee_id, db)
    
    # Select next question if not stopped
    next_q = None
    if session.status == "in_progress":
        # Simplified: all operational questions not yet seen
        employee_skill_ids = await _get_employee_skill_ids(db, session.employee_id)
        assessment_scope = _assessment_question_scope(session.assessment_id)
        candidates_query = select(Question).where(
            Question.calibration_status == "operational",
            Question.skill_id.in_(employee_skill_ids),
            Question.sector == assessment_scope,
            ~Question.id.in_(session.administered_question_ids)
        )
        res = await db.execute(candidates_query)
        all_candidates = res.scalars().all()
        if not all_candidates:
            # Backward-compatible fallback for older assessments created before scoping.
            fallback_query = select(Question).where(
                Question.calibration_status == "operational",
                Question.skill_id.in_(employee_skill_ids),
                ~Question.id.in_(session.administered_question_ids),
            )
            fallback_res = await db.execute(fallback_query)
            all_candidates = fallback_res.scalars().all()
        
        candidates_data = [
            {"id": q.id, "a": q.a_param, "b": q.b_param, "c": q.c_param}
            for q in all_candidates
        ]
        
        next_id = select_next_item(new_theta, candidates_data)
        if next_id:
            next_q = next(q for q in all_candidates if q.id == next_id)
        else:
            # Out of items - finalize session to keep score reporting consistent.
            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)
            session.final_proficiency = theta_to_proficiency(new_theta)
            session.final_se = new_se

    await db.commit()
    
    return SessionResponse(
        id=session.id,
        status=session.status,
        current_theta=session.current_theta,
        current_se=session.current_se,
        questions_served=session.questions_served,
        started_at=session.started_at,
        next_question=QuestionSchema(
            id=next_q.id,
            question_text=next_q.question_text,
            question_type=next_q.question_type,
            options=next_q.options,
            bloom_level=next_q.bloom_level,
            sector=next_q.sector
        ) if next_q else None
    )

@router.get("/sessions/{session_id}/results", response_model=SessionResultSchema)
async def get_results(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(AssessmentSession, session_id)
    if not session or session.status != "completed":
        raise HTTPException(status_code=400, detail="Result not ready")
        
    return SessionResultSchema(
        id=session.id,
        final_proficiency=session.final_proficiency,
        proficiency_level="advanced", # Logic mapping needed
        final_se=session.final_se,
        time_taken_seconds=session.time_taken_seconds or 0,
        skills_covered=["Skill A"], # Aggregate from questions
        recommendations=["Continue practicing X"] # Generate via GapAnalysis
    )


@router.get("/my-scores", response_model=list[dict])
async def list_my_scores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee_id = current_user.employee_id
    if not employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")

    result = await db.execute(
        select(AssessmentSession, Assessment)
        .join(Assessment, Assessment.id == AssessmentSession.assessment_id)
        .where(
            AssessmentSession.employee_id == employee_id,
            AssessmentSession.status == "completed",
        )
        .order_by(AssessmentSession.completed_at.desc(), AssessmentSession.started_at.desc())
    )
    rows = result.all()

    response_counts_res = await db.execute(
        select(
            AssessmentResponse.session_id,
            func.count(AssessmentResponse.id).label("total_answers"),
            func.count(AssessmentResponse.id)
            .filter(AssessmentResponse.is_correct.is_(True))
            .label("correct_answers"),
            func.count(AssessmentResponse.id)
            .filter(AssessmentResponse.is_correct.is_(False))
            .label("wrong_answers"),
        )
        .where(AssessmentResponse.session_id.in_([session.id for session, _ in rows]))
        .group_by(AssessmentResponse.session_id)
    )
    counts_by_session: dict[uuid.UUID, dict[str, int]] = {}
    for row in response_counts_res.all():
        counts_by_session[row.session_id] = {
            "total_answers": int(row.total_answers or 0),
            "correct_answers": int(row.correct_answers or 0),
            "wrong_answers": int(row.wrong_answers or 0),
        }

    payload: list[dict] = []
    for session, assessment in rows:
        score_counts = counts_by_session.get(
            session.id,
            {"total_answers": 0, "correct_answers": 0, "wrong_answers": 0},
        )
        payload.append(
            {
                "session_id": str(session.id),
                "assessment_id": str(assessment.id),
                "assessment_title": assessment.title,
                "assessment_type": _assessment_type_from_title(assessment.title),
                "score": round(float(session.final_proficiency or 0), 2),
                "questions_served": session.questions_served or 0,
                "total_answers": score_counts["total_answers"],
                "correct_answers": score_counts["correct_answers"],
                "wrong_answers": score_counts["wrong_answers"],
                "percentage_score": round(
                    (score_counts["correct_answers"] / score_counts["total_answers"]) * 100, 2
                ) if score_counts["total_answers"] > 0 else 0.0,
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            }
        )
    return payload
@router.post("/generate-personalized", response_model=dict)
async def generate_personalized_assessment(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    employee_id = current_user.employee_id
    if not employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")

    # 1. Get employee skills
    scores_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == employee_id)
    )
    skill_rows = scores_res.all()
    if not skill_rows:
        raise HTTPException(
            status_code=400,
            detail="No skills found in profile. Please add skills to your profile first."
        )

    skill_names = [skill.canonical_name for _, skill in skill_rows]

    # 2. Create a new assessment record
    assessment_id = uuid.uuid4()
    new_assessment = Assessment(
        id=assessment_id,
        org_id=current_user.org_id,
        title=f"{CURRENT_ASSESSMENT_TITLE_PREFIX}{datetime.now().strftime('%b %d')}"
    )
    db.add(new_assessment)
    await db.flush()

    # 3. Build questions for the employee's skills.
    #    We use the reliable fallback bank directly — the Gemini schema API
    #    currently rejects the SkillAssessment Pydantic model (Unknown field:
    #    default), so attempting it just wastes time. When the SDK is updated,
    #    replace the fallback call below with a GeminiService.generate_assessment
    #    call and keep the fallback as the else-branch.
    total_questions = 0
    assessment_scope = _assessment_question_scope(assessment_id)
    used_texts: set[str] = set()
    for _, skill_obj in skill_rows[:3]:
        existing_texts_res = await db.execute(
            select(Question.question_text).where(Question.skill_id == skill_obj.id)
        )
        existing_texts = {
            (row[0] or "").strip().lower()
            for row in existing_texts_res.all()
            if row[0]
        }

        for idx, fq in enumerate(_build_fallback_questions(skill_obj.id, skill_obj.canonical_name), start=1):
            # Guarantee uniqueness against:
            # 1) existing DB questions for this skill
            # 2) other questions created in this same request
            base_text = (fq.question_text or "").strip()
            candidate_text = base_text
            suffix = 2
            while (
                candidate_text.lower() in existing_texts
                or candidate_text.lower() in used_texts
            ):
                candidate_text = f"{base_text} (Variant {suffix})"
                suffix += 1

            fq.question_text = candidate_text
            fq.sector = assessment_scope
            existing_texts.add(candidate_text.lower())
            used_texts.add(candidate_text.lower())

            db.add(fq)
            total_questions += 1

    return {
        "success": True,
        "assessment_id": str(assessment_id),
        "title": new_assessment.title,
        "skills_covered": skill_names,
        "questions_generated": total_questions,
    }


@router.post("/generate-skill-test", response_model=dict)
async def generate_skill_test(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee_id = current_user.employee_id
    if not employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")

    scores_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == employee_id)
        .order_by(Skill.canonical_name.asc())
    )
    skill_rows = scores_res.all()
    if not skill_rows:
        raise HTTPException(
            status_code=400,
            detail="No skills found in profile. Please add skills to your profile first.",
        )

    assessment_id = uuid.uuid4()
    new_assessment = Assessment(
        id=assessment_id,
        org_id=current_user.org_id,
        title=f"{SKILL_TEST_TITLE_PREFIX}{datetime.now().strftime('%b %d')}",
    )
    db.add(new_assessment)
    await db.flush()

    assessment_scope = _assessment_question_scope(assessment_id)
    questions = _build_skill_test_questions(skill_rows, assessment_scope, target_count=20)
    for q in questions:
        db.add(q)

    return {
        "success": True,
        "assessment_id": str(assessment_id),
        "title": new_assessment.title,
        "questions_generated": len(questions),
        "skills_covered": [skill.canonical_name for _, skill in skill_rows],
    }


def _build_fallback_questions(skill_id: uuid.UUID, skill_name: str) -> list:
    """
    Returns 3 generic MCQ questions for a skill when Gemini is unavailable.
    These ensure every generated assessment is always startable.
    """
    return [
        Question(
            skill_id=skill_id,
            question_text=f"How would you best describe your current level of expertise in {skill_name}?",
            question_type="mcq",
            options=[
                {"id": "opt_0", "text": "Beginner – I have heard of it but rarely applied it"},
                {"id": "opt_1", "text": "Intermediate – I apply it with occasional guidance"},
                {"id": "opt_2", "text": "Advanced – I apply it independently and effectively"},
                {"id": "opt_3", "text": "Expert – I lead initiatives and mentor others in it"},
            ],
            correct_answer_id="opt_2",
            explanation=(
                f"Genuine proficiency in {skill_name} is demonstrated by consistent independent "
                "application and a track record of delivering results."
            ),
            calibration_status="operational",
            bloom_level="evaluate",
            a_param=1.0,
            b_param=0.0,
            c_param=0.25,
        ),
        Question(
            skill_id=skill_id,
            question_text=f"Which of the following is the most critical challenge when applying {skill_name} in a professional context?",
            question_type="mcq",
            options=[
                {"id": "opt_0", "text": "Keeping pace with rapidly evolving best practices"},
                {"id": "opt_1", "text": "Finding relevant online courses"},
                {"id": "opt_2", "text": "Obtaining management approval"},
                {"id": "opt_3", "text": "Sourcing the right tools"},
            ],
            correct_answer_id="opt_0",
            explanation=(
                f"In {skill_name}, the most persistent professional challenge is staying current "
                "as standards, tools, and methodologies continuously evolve."
            ),
            calibration_status="operational",
            bloom_level="analyze",
            a_param=0.9,
            b_param=0.4,
            c_param=0.25,
        ),
        Question(
            skill_id=skill_id,
            question_text=f"What is the most effective strategy for building lasting expertise in {skill_name}?",
            question_type="mcq",
            options=[
                {"id": "opt_0", "text": "Reading documentation once and moving on"},
                {"id": "opt_1", "text": "Combining hands-on practice with structured, iterative learning"},
                {"id": "opt_2", "text": "Attending a single certification course"},
                {"id": "opt_3", "text": "Observing experienced colleagues only"},
            ],
            correct_answer_id="opt_1",
            explanation=(
                f"Sustained expertise in {skill_name} comes from deliberate practice combined "
                "with structured learning and real-world application over time."
            ),
            calibration_status="operational",
            bloom_level="apply",
            a_param=1.1,
            b_param=-0.3,
            c_param=0.25,
        ),
    ]


def _build_skill_test_questions(
    skill_rows: list,
    assessment_scope: str,
    target_count: int = 20,
) -> list[Question]:
    """
    Build a deterministic 20-question skill test across all employee skills.
    Ensures unique question_text values and standard MCQ marking.
    """
    if not skill_rows:
        return []

    questions: list[Question] = []
    used_texts: set[str] = set()
    idx = 0
    variant = 1

    while len(questions) < target_count:
        _, skill_obj = skill_rows[idx % len(skill_rows)]
        skill_name = skill_obj.canonical_name
        q_no = len(questions) + 1
        text = f"[Q{q_no}] In {skill_name}, what is the best professional action for scenario variant {variant}?"

        if text.lower() in used_texts:
            variant += 1
            idx += 1
            continue

        option_bank = [
            "Follow an ad-hoc approach without validation.",
            "Apply a structured method and validate outcomes.",
            "Skip requirements and optimize only for speed.",
            "Delegate without defining quality checks.",
        ]
        correct_idx = 1

        options = [{"id": f"opt_{i}", "text": option_bank[i]} for i in range(4)]
        q = Question(
            skill_id=skill_obj.id,
            question_text=text,
            question_type="mcq",
            options=options,
            correct_answer_id=f"opt_{correct_idx}",
            explanation=(
                f"For {skill_name}, a structured and validated approach gives the most reliable results."
            ),
            calibration_status="operational",
            bloom_level="apply",
            sector=assessment_scope,
            a_param=1.0,
            b_param=0.0,
            c_param=0.25,
        )
        questions.append(q)
        used_texts.add(text.lower())
        idx += 1
        if idx % len(skill_rows) == 0:
            variant += 1

    return questions
