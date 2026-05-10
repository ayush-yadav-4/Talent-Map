import json
import logging
import urllib.parse
import warnings
from typing import List, Dict, Any, Optional

# Suppress legacy package deprecation at import; migrate to google.genai when we refactor.
with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    import google.generativeai as genai
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

if (settings.gemini_api_key or "").strip():
    genai.configure(api_key=settings.gemini_api_key)

# Helper for model fallback
def get_model_name(default="gemini-1.5-flash"):
    return settings.gemini_model or default

class MCQOption(BaseModel):
    id: str
    text: str
    is_correct: bool
    misconception_targeted: Optional[str] = None

class GeneratedQuestion(BaseModel):
    question_text: str
    question_type: str
    options: List[MCQOption]
    correct_answer_id: str
    explanation: str
    estimated_difficulty_b: float
    bloom_level: str
    audience_type: str
    sector: str

class ScoringRubricDimension(BaseModel):
    dimension: str
    max_points: int
    criteria: Dict[int, str]

class OpenTextScoringResult(BaseModel):
    score: float
    rationale: str
    feedback: str

class AnalyzedSkill(BaseModel):
    skill_name: str
    proficiency_estimate: float # 1.0 - 5.0
    evidence_found: str
    is_technical: bool

class ProfileAnalysis(BaseModel):
    summary: str
    strengths: List[str]
    growth_areas: List[str]
    recommended_roles: List[str]
    suggested_assessment_plan: List[str]

class RequiredSkill(BaseModel):
    skill_name: str
    min_proficiency: float # 1.0 - 5.0
    importance: str # "Essential", "Desirable"
    is_technical: bool

class RoleExtractionResult(BaseModel):
    job_title: str
    description_summary: str
    required_skills: List[RequiredSkill]
    role_summary: Optional[str] = None
    qualification: Optional[str] = None
    responsibilities: Optional[str] = None
    domain: Optional[str] = None
    role_type_category: Optional[str] = None
    key_deliverables: Optional[str] = None
    stakeholders: Optional[str] = None
    success_metrics: Optional[str] = None

class LearningStep(BaseModel):
    title: str
    description: str
    resource_type: str # "Video", "Article", "Course", "Project"
    estimated_duration: str
    difficulty: str

class LearningPath(BaseModel):
    skill_name: str
    target_proficiency: float
    curated_steps: List[LearningStep]
    summary_advice: str

class CourseSuggestionItem(BaseModel):
    title: str
    provider: str
    level: str
    url: str

class SkillCourseRecommendations(BaseModel):
    gap_courses: List[CourseSuggestionItem]
    upgrade_courses: List[CourseSuggestionItem]

class AssessmentQuestion(BaseModel):
    question_text: str
    options: List[str]
    correct_option_index: int
    scenario_context: Optional[str] = None
    explanation: str

class SkillAssessment(BaseModel):
    skill_name: str
    target_proficiency: float
    questions: List[AssessmentQuestion]

class TrajectoryMilestone(BaseModel):
    timeframe: str # "6 months", "12 months"
    predicted_role: str
    expected_skills: List[str]
    confidence_score: float

class CareerTrajectory(BaseModel):
    current_path: str
    milestones: List[TrajectoryMilestone]
    readiness_score: float


class TaxonomySeedSkill(BaseModel):
    canonical_name: str
    domain: str
    sub_domain: Optional[str]
    is_compliance: bool
    description: Optional[str]


class TaxonomySeedEnvelope(BaseModel):
    skills: List[TaxonomySeedSkill] = Field(default_factory=list)


class MarketSkillSignal(BaseModel):
    skill_name: str
    trend: str  # rising | stable | declining
    demand_level: int
    why: str


class MarketSignalsEnvelope(BaseModel):
    signals: List[MarketSkillSignal] = Field(default_factory=list)


class TeamMemberSuggestion(BaseModel):
    employee_id: str
    employee_name: str
    match_score: float # 0-100
    seniority_match: bool
    skill_alignment: List[str]
    reasoning: str

class TeamSuggestionResult(BaseModel):
    recommendations: List[TeamMemberSuggestion]
    summary_analysis: str

class ReadinessScorecard(BaseModel):
    role_fit_score: float # 0-100
    promotion_fit_score: float # 0-100
    internal_mobility_score: float # 0-100
    critical_skills_missing: List[str]
    strengths: List[str]
    recommended_next_role: str
    readiness_summary: str
    mobility_recommendations: List[str]

class LearningResource(BaseModel):
    title: str
    url: str
    type: str # "Video", "Article", "Course", "Project"

class IDPMilestone(BaseModel):
    title: str
    description: str
    target_skills: List[str]
    learning_resources: List[LearningResource]
    due_date_relative_days: int
    check_in_focus: str

class IDPResult(BaseModel):
    title: str
    description: str
    target_role: str
    milestones: List[IDPMilestone]
    summary: str

class HireVsUpskillResult(BaseModel):
    decision: str
    upskill_cost_estimate: float
    hire_cost_estimate: float
    time_to_upskill_months: float
    time_to_hire_months: float
    reasoning: str


class GeminiService:
    @staticmethod
    def _normalize_text(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, list):
            return "\n".join(f"- {str(item).strip()}" for item in value if str(item).strip())
        return str(value).strip()

    @staticmethod
    def _coerce_role_extraction_payload(raw: Any) -> dict:
        """
        Normalize LLM output variants into RoleExtractionResult-compatible payload.
        """
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except Exception:
                raw = {}
        if not isinstance(raw, dict):
            raw = {}

        job_title = (
            raw.get("job_title")
            or raw.get("title")
            or raw.get("role_title")
            or "Role"
        )
        description_summary = (
            raw.get("description_summary")
            or raw.get("role_summary")
            or raw.get("summary")
            or ""
        )

        raw_skills = (
            raw.get("required_skills")
            or raw.get("skills")
            or raw.get("skill_list")
            or []
        )

        normalized_skills: list[dict[str, Any]] = []
        for item in raw_skills:
            if isinstance(item, str):
                normalized_skills.append(
                    {
                        "skill_name": item.strip(),
                        "min_proficiency": 3.0,
                        "importance": "Essential",
                        "is_technical": False,
                    }
                )
                continue
            if not isinstance(item, dict):
                continue
            name = item.get("skill_name") or item.get("name") or item.get("skill")
            if not name:
                continue
            min_prof = item.get("min_proficiency") or item.get("required_proficiency") or item.get("proficiency") or 3.0
            try:
                min_prof = float(min_prof)
            except Exception:
                min_prof = 3.0
            normalized_skills.append(
                {
                    "skill_name": str(name).strip(),
                    "min_proficiency": max(1.0, min(5.0, min_prof)),
                    "importance": item.get("importance") or item.get("criticality") or "Essential",
                    "is_technical": bool(item.get("is_technical", False)),
                }
            )

        if not normalized_skills:
            normalized_skills = [
                {
                    "skill_name": "Communication",
                    "min_proficiency": 3.0,
                    "importance": "Essential",
                    "is_technical": False,
                }
            ]

        return {
            "job_title": str(job_title).strip() or "Role",
            "description_summary": str(description_summary).strip(),
            "required_skills": normalized_skills,
            "role_summary": GeminiService._normalize_text(raw.get("role_summary") or description_summary or ""),
            "qualification": GeminiService._normalize_text(raw.get("qualification") or raw.get("qualifications") or ""),
            "responsibilities": GeminiService._normalize_text(raw.get("responsibilities") or raw.get("key_responsibilities") or ""),
            "domain": str(raw.get("domain") or "").strip(),
            "role_type_category": str(raw.get("role_type_category") or raw.get("role_type") or "").strip(),
            "key_deliverables": GeminiService._normalize_text(raw.get("key_deliverables") or raw.get("deliverables") or ""),
            "stakeholders": GeminiService._normalize_text(raw.get("stakeholders") or ""),
            "success_metrics": GeminiService._normalize_text(raw.get("success_metrics") or raw.get("kpis") or ""),
        }

    @staticmethod
    def extract_skills_from_resume(resume_text: str) -> List[AnalyzedSkill]:
        """
        Parses resume text and extracts a structured list of skills.
        """
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Extract professional skills from the following resume text.
        Resume: {resume_text}
        
        Instructions:
        1. Identify specific, granular skills (e.g., 'Python', 'React.js', 'Strategic Planning', 'Agile Methodologies').
        2. Categorize each as technical (True) or non-technical (False).
        3. Estimate proficiency on a scale of 1.0 to 5.0:
           - 1.0: Awareness / Beginner
           - 2.0: Novice
           - 3.0: Intermediate / Proficient
           - 4.0: Advanced
           - 5.0: Expert / Mastery
        4. Provide a brief sentence of evidence found in the resume for each skill.
        5. If the resume is empty or invalid, return an empty list.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=List[AnalyzedSkill]
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error extracting skills: {e}")
            return []

    @staticmethod
    def analyze_skill_profile(skills: List[Dict[str, Any]], job_title: str) -> Optional[ProfileAnalysis]:
        """
        Analyzes the full skill set of an employee against their current role.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"""
        Analyze the following skill profile for an employee with the role: {job_title}.
        Skills: {json.dumps(skills)}
        
        Provide a detailed summary, strengths, growth areas, and a plan for skills that should be assessed next.
        Focus on identifying gaps relative to a standard {job_title} role.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=ProfileAnalysis
                )
            )
            return ProfileAnalysis.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error analyzing profile: {e}")
            return None
    @staticmethod
    def generate_question(
        skill_name: str,
        skill_definition: str,
        bloom_level: str,
        difficulty_tier: str, # easy, medium, hard
        audience_type: str,
        sector: str
    ) -> Optional[GeneratedQuestion]:
        """
        Generates a structured question using Gemini.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"""
        Generate a high-quality assessment question for the following skill:
        Skill: {skill_name}
        Definition: {skill_definition}
        
        Requirements:
        1. Bloom's Taxonomy Level: {bloom_level}
        2. Difficulty Tier: {difficulty_tier}
        3. Audience Type: {audience_type}
        4. Sector Context: {sector}
        
        Follow these MCQ rules:
        - One unambiguous correct answer.
        - Three plausible distractors each targeting a specific misconception.
        - No "all of the above" or "none of the above".
        - No negative stems.
        - All options roughly equal length.
        - Reading level Grade 10.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=GeneratedQuestion
                )
            )
            return GeneratedQuestion.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            return None

    @staticmethod
    def score_open_text(
        question_text: str,
        employee_response: str,
        rubric: Dict[str, Any]
    ) -> Optional[OpenTextScoringResult]:
        """
        Scores an open-text response using Gemini.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"""
        Score the following employee response based on the question and rubric.
        
        Question: {question_text}
        Employee Response: {employee_response}
        Rubric: {json.dumps(rubric)}
        
        Evaluate accurately and provide a score between 1.0 and 5.0.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=OpenTextScoringResult
                )
            )
            return OpenTextScoringResult.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error scoring response: {e}")
            return None

    @staticmethod
    def simulate_responses(
        question_text: str,
        options: List[Dict],
        ability_level: float # -3.0 to 3.0
    ) -> int: # returns 1 if correct, 0 if incorrect
        """
        Simulates an employee response for IRT pre-calibration.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        proficiency = ((ability_level + 3) / 6) * 4 + 1
        
        prompt = f"""
        Roleplay as an employee with a proficiency level of {proficiency:.1f} out of 5.0.
        Your task is to answer the following multiple-choice question.
        
        Question: {question_text}
        Options: {json.dumps(options)}
        
        Respond ONLY with the ID of the option you choose.
        """
        
        try:
            response = model.generate_content(prompt)
            chosen_id = response.text.strip()
            # Find the correct answer ID
            correct_id = next(opt['id'] for opt in options if opt.get('is_correct'))
            return 1 if chosen_id == correct_id else 0
        except Exception as e:
            logger.error(f"Error simulating response: {e}")
            return 0
    def extract_skills_from_jd(requirements_text: str) -> Optional[RoleExtractionResult]:
        """
        Extracts structured skills and summary from JD text.
        Tolerates partial/variant LLM JSON keys.
        """
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Extract professional skills from the following Job Description text:
        ---
        {requirements_text}
        ---
        Instructions:
        1. Return JSON with keys: job_title, description_summary, required_skills.
        2. required_skills must be a list of objects:
           {{skill_name, min_proficiency(1-5), importance(Essential|Desirable), is_technical(bool)}}.
        3. Include both technical and soft skills.
        4. Also return: role_summary, qualification, responsibilities, domain, role_type_category.
        5. Also return: key_deliverables, stakeholders, success_metrics.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            normalized = GeminiService._coerce_role_extraction_payload(response.text)
            return RoleExtractionResult.model_validate(normalized)
        except Exception as e:
            logger.error(f"Error extracting JD skills: {e}")
            return None

    @staticmethod
    def get_embedding(text: str) -> List[float]:
        """
        Generates a vector embedding for the given text using Gemini.
        """
        try:
            # First try text-embedding-004
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.warning(f"Error generating 004 embedding: {e}. Trying fallback models/embedding-001.")
            try:
                # Fallback to older model
                result = genai.embed_content(
                    model="models/embedding-001",
                    content=text,
                    task_type="retrieval_document"
                )
                # embedding-001 is 768D as well
                return result['embedding']
            except Exception as e2:
                logger.error(f"Critical error generating embedding: {e2}")
                return []

    @staticmethod
    def generate_learning_path(skill_name: str, current_prof: float, target_prof: float) -> Optional[LearningPath]:
        """
        Generates a personalized learning path to bridge a skill gap.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"""
        Create a personalized learning path for the skill: {skill_name}.
        Current Proficiency: {current_prof}/5.0
        Target Proficiency: {target_prof}/5.0
        
        Instructions:
        1. Provide 3-5 logical steps to bridge this specific gap.
        2. Suggest real or representative resource types (e.g., specific courses on Coursera, YouTube tutorial topics, or hands-on projects).
        3. Keep the advice actionable and encouraging.
        4. Return the result in valid JSON matching the LearningPath schema.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=LearningPath
                )
            )
            return LearningPath.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error generating learning path: {e}")
            return None

    @staticmethod
    def suggest_courses(skill_name: str, role_title: str) -> Optional[SkillCourseRecommendations]:
        """
        Suggests real-world courses for gap-closing and upgrading a specific skill.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"Suggest 1 beginner course (gap_courses) and 1 advanced course (upgrade_courses) for {skill_name}."
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=SkillCourseRecommendations
                )
            )
            result = SkillCourseRecommendations.model_validate_json(response.text)
            
            # Post-process links to ensure they are valid search links rather than hallucinated URLs
            for course in result.gap_courses:
                course.url = f"https://www.google.com/search?q={urllib.parse.quote(course.title + ' ' + course.provider + ' course')}"
            for course in result.upgrade_courses:
                course.url = f"https://www.google.com/search?q={urllib.parse.quote(course.title + ' ' + course.provider + ' course')}"
                
            return result
        except Exception as e:
            logger.error(f"Error suggesting courses for {skill_name}: {e}")
            return None
    @staticmethod
    def analyze_gap_vs_jd(employee_skills: List[Dict], jd_requirements: Dict) -> Dict[str, Any]:
        """
        Compares an employee's skills against a Job Description's requirements.
        """
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Compare the following Employee Skills against the Job Description Requirements.
        
        Employee Skills: {json.dumps(employee_skills)}
        JD Requirements: {json.dumps(jd_requirements)}
        
        Instructions:
        1. Identify specific gaps (skills required by JD but missing or at low proficiency in employee profile).
        2. Identify strengths (where the employee exceeds or meets requirements).
        3. Suggest "related things" or soft skills that would make the employee a better fit.
        4. Provide an overall 'Fit Score' (0-100%).
        5. Return a structured JSON response with: fit_score, strengths (list), gaps (list), and recommendations (list).
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error in JD gap analysis: {e}")
            return {"error": "Could not complete analysis"}

    @staticmethod
    def generate_assessment(skill_name: str, proficiency: float) -> Optional[SkillAssessment]:
        """
        Generates a set of MCQ and scenario questions for a skill.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"""
        Generate a technical assessment for the skill: {skill_name}.
        Target Proficiency Level: {proficiency}/5.0
        
        Requirements:
        1. Create 5 challenging questions.
        2. Mix conceptual MCQs with practical scenario-based questions.
        3. Provide 4 options per question.
        4. Include a detailed explanation for the correct answer.
        5. Return valid JSON matching the SkillAssessment schema.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=SkillAssessment
                )
            )
            return SkillAssessment.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error generating assessment: {e}")
            return None

    @staticmethod
    def predict_career_trajectory(skills: List[Dict], job_title: str) -> Optional[CareerTrajectory]:
        """
        Predicts career growth milestones based on current skills.
        """
        model = genai.GenerativeModel(settings.gemini_model or 'gemini-1.5-flash')
        
        prompt = f"""
        Predict the career trajectory for an employee with the following profile:
        Current Job Title: {job_title}
        Current Skills: {skills}
        
        Instructions:
        1. Project their growth at 6 months and 12 months.
        2. Identify potential next-level roles.
        3. List specific skills they will likely acquire.
        4. Provide a 'readiness score' (0-100) for a promotion.
        5. Return valid JSON matching the CareerTrajectory schema.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=CareerTrajectory
                )
            )
            return CareerTrajectory.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error predicting trajectory: {e}")
            return None

    @staticmethod
    def _gemini_configured() -> bool:
        return bool((settings.gemini_api_key or "").strip())

    @staticmethod
    def seed_skills_for_sector(sector: str, domains: List[str], count: int = 80) -> List[Dict[str, Any]]:
        """
        Generate a sector-aware skill taxonomy slice via structured Gemini output.
        """
        if not GeminiService._gemini_configured():
            logger.warning("taxonomy.seed.skip_no_gemini_key")
            return []
        model = genai.GenerativeModel(get_model_name())
        domain_list = ", ".join(domains)
        cap = min(max(count, 10), 120)
        prompt = f"""
You are building a workforce skills taxonomy for HR planning.
Organization sector: {sector}
Skill domains to cover (spread skills across these): {domain_list}

Return JSON with key "skills": an array of {cap} distinct workplace skills relevant to this sector.
Prioritize non-technical operational, compliance, safety, and people skills for non-IT sectors.
For corporate/IT sectors, include a balanced mix of technical and soft skills.

Each skill object must have:
- canonical_name: short unique name (max 120 chars)
- domain: one of the listed domains (closest match)
- sub_domain: optional finer bucket (max 80 chars) or null
- is_compliance: true only if regulatory / mandatory certification context
- description: one sentence or null

No duplicates. Use professional HR-friendly language.
"""
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=TaxonomySeedEnvelope,
                ),
            )
            env = TaxonomySeedEnvelope.model_validate_json(response.text)
            out: List[Dict[str, Any]] = []
            for s in env.skills[:cap]:
                out.append(
                    {
                        "canonical_name": s.canonical_name.strip(),
                        "domain": (s.domain or "").strip()[:100] or domains[0],
                        "sub_domain": (s.sub_domain or "").strip()[:100] or None,
                        "is_compliance": bool(s.is_compliance),
                        "description": (s.description or "").strip() or None,
                    }
                )
            return out
        except Exception as e:
            logger.exception("taxonomy.seed.failed sector=%s err=%s", sector, e)
            return []

    @staticmethod
    def get_market_skill_demand(sector: str, role: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Simulated market demand signals (LLM synthesis — not live job-scrape).
        """
        if not GeminiService._gemini_configured():
            return []
        model = genai.GenerativeModel(get_model_name())
        lim = min(max(limit, 3), 25)
        prompt = f"""
You summarize current labor-market skill demand for hiring and workforce planning.
Sector: {sector}
Reference role (for context): {role or "General workforce"}

Return JSON with key "signals": exactly {lim} objects, each:
- skill_name: string
- trend: one of "rising", "stable", "declining"
- demand_level: integer 1-5 (5 = very high demand)
- why: one concise sentence citing typical market drivers (generic, no fabricated statistics)

Base guidance on widely discussed 2024-2026 workforce trends; do not invent specific survey names or URLs.
"""
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=MarketSignalsEnvelope,
                ),
            )
            env = MarketSignalsEnvelope.model_validate_json(response.text)
            return [sig.model_dump() for sig in env.signals[:lim]]
        except Exception as e:
            logger.exception("market_signals.failed sector=%s err=%s", sector, e)
            return []

    @staticmethod
    def derive_learning_style(scores: Dict[str, Any], assessment_type: str) -> Dict[str, str]:
        """
        Map raw psychometric scores to dominant trait + suggested learning style labels.
        """
        if not GeminiService._gemini_configured():
            return {
                "dominant_trait": "unknown",
                "learning_style": "balanced",
                "summary": "Configure GEMINI_API_KEY for AI-derived learning style.",
            }
        model = genai.GenerativeModel(get_model_name())
        prompt = f"""
Assessment type: {assessment_type}
Raw dimension scores (0-100 scale or similar): {json.dumps(scores)}

Return JSON matching schema:
- dominant_trait: short label (e.g. Dominant Steadiness, High Openness)
- learning_style: one of: visual, auditory, reading_writing, kinesthetic, social, self_paced, structured
- summary: 2 sentences for L&D on how to tailor training

Use only the provided numbers; do not invent extra dimensions.
"""
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=LearningStyleResult,
                ),
            )
            r = LearningStyleResult.model_validate_json(response.text)
            return {
                "dominant_trait": r.dominant_trait.strip(),
                "learning_style": r.learning_style.strip(),
                "summary": r.summary.strip(),
            }
        except Exception as e:
            logger.exception("psychometric.derive.failed err=%s", e)
            return {
                "dominant_trait": "unknown",
                "learning_style": "balanced",
                "summary": "Could not derive profile.",
            }
    @staticmethod
    def suggest_team_members(project_data: Dict[str, Any], candidate_profiles: List[Dict[str, Any]]) -> Optional[TeamSuggestionResult]:
        """
        Suggests the best team members for a project based on skills, seniority, and availability.
        """
        if not GeminiService._gemini_configured():
            return None
            
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Analyze the following Project Requirements and a list of Available Candidate Profiles to suggest the best team.
        
        PROJECT REQUIREMENTS:
        - Name: {project_data.get('name')}
        - Description: {project_data.get('description')}
        - Tech Stack: {project_data.get('tech_stack')}
        - Job Title (if linked): {project_data.get('job_title')}
        
        CANDIDATE PROFILES:
        {json.dumps(candidate_profiles)}
        
        INSTRUCTIONS:
        1. For each candidate, calculate a 'match_score' (0-100) based on how well their skills and seniority align with the project.
        2. Check if their seniority level matches the project's likely needs (seniority_match: bool).
        3. Identify specific skills they have that align with the project's tech stack or description (skill_alignment: list).
        4. Provide a concise 'reasoning' for each recommendation.
        5. Provide a 'summary_analysis' of the overall team suitability.
        6. Return the results in structured JSON matching the TeamSuggestionResult schema.
        7. Only recommend candidates with a match_score > 60.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=TeamSuggestionResult
                )
            )
            return TeamSuggestionResult.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error suggesting team members: {e}")
            return None

    @staticmethod
    def analyze_readiness_scorecard(employee_data: Dict[str, Any], current_role_requirements: Dict[str, Any], next_level_requirements: Optional[Dict[str, Any]] = None) -> Optional[ReadinessScorecard]:
        """
        Generates a comprehensive readiness scorecard for an employee.
        """
        if not GeminiService._gemini_configured():
            return None
            
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Analyze the Career Readiness for the following employee:
        
        EMPLOYEE PROFILE:
        - Name: {employee_data.get('full_name')}
        - Current Job Title: {employee_data.get('job_title')}
        - Seniority: {employee_data.get('seniority_level')}
        - Skills: {json.dumps(employee_data.get('skills'))}
        
        CURRENT ROLE REQUIREMENTS:
        {json.dumps(current_role_requirements)}
        
        NEXT LEVEL ROLE REQUIREMENTS (Optional):
        {json.dumps(next_level_requirements) if next_level_requirements else "Standard next level for " + str(employee_data.get('job_title'))}
        
        INSTRUCTIONS:
        1. Calculate role_fit_score (how well they fit their current role).
        2. Calculate promotion_fit_score (how ready they are for the next seniority level or a lead role).
        3. Calculate internal_mobility_score (how easily they could transition to a different department/domain based on transferable skills).
        4. Identify critical_skills_missing for their growth.
        5. Highlight their key strengths.
        6. Recommend the 'recommended_next_role'.
        7. Provide a concise 'readiness_summary'.
        8. Provide 'mobility_recommendations' (other roles they could do).
        9. Return the result in valid JSON matching the ReadinessScorecard schema.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=ReadinessScorecard
                )
            )
            return ReadinessScorecard.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error analyzing readiness scorecard: {e}")
            return None

    @staticmethod
    def generate_idp(employee_data: Dict[str, Any], skill_gaps: List[Dict[str, Any]], target_role: Optional[str] = None) -> Optional[IDPResult]:
        """
        Generates an Individualized Development Plan (IDP) based on skill gaps.
        """
        if not GeminiService._gemini_configured():
            return None
            
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Generate a professional Individualized Development Plan (IDP) for the following employee:
        
        EMPLOYEE:
        - Name: {employee_data.get('full_name')}
        - Current Job Title: {employee_data.get('job_title')}
        - Seniority: {employee_data.get('seniority_level')}
        - Current Skills: {json.dumps(employee_data.get('current_skills'))}
        
        SKILL GAPS IDENTIFIED:
        {json.dumps(skill_gaps)}
        
        TARGET ROLE (Optional):
        {target_role if target_role else "Growth in current role"}
        
        INSTRUCTIONS:
        1. Create a 3-6 month development plan.
        2. Return the result in valid JSON matching the IDPResult schema.
        3. MANDATORY FIELDS (Must be present in JSON):
           - title (str): A catchy title for the plan.
           - description (str): Overall goal.
           - target_role (str): The role being worked towards. Use an empty string if none.
           - milestones (list): 3-5 milestones.
             - Each milestone MUST have: title, description, target_skills (list of strings), learning_resources (list of objects with title, url, type), due_date_relative_days (int), and check_in_focus (str).
           - summary (str): Concise closing.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=IDPResult
                )
            )
            
            # Clean response text in case of markdown wrapping
            text = response.text.strip()
            if text.startswith("```json"):
                text = text.replace("```json", "", 1).replace("```", "", 1).strip()
            elif text.startswith("```"):
                text = text.replace("```", "", 1).replace("```", "", 1).strip()
                
            return IDPResult.model_validate_json(text)
        except Exception as e:
            logger.error(f"Error generating IDP: {e}")
            if 'response' in locals():
                logger.error(f"Raw response text: {response.text}")
            return None

    @staticmethod
    def analyze_hire_vs_upskill(
        employee_persona: Dict[str, Any],
        job_description: Dict[str, Any],
        market_data: Dict[str, Any]
    ) -> Optional[HireVsUpskillResult]:
        """
        Analyzes the cost and time trade-offs between upskilling an existing employee
        and hiring a new external candidate for a role, using a detailed employee persona.
        """
        if not GeminiService._gemini_configured():
            return None
            
        model = genai.GenerativeModel(get_model_name())
        
        prompt = f"""
        Act as an HR Data Scientist. Analyze the decision to either UPSKILL an existing employee or HIRE a new candidate for a role.
        
        DETAILED EMPLOYEE PERSONA (For Upskilling):
        - Name: {employee_persona.get('full_name')}
        - Current Job Title: {employee_persona.get('job_title')}
        - Seniority Level: {employee_persona.get('seniority_level')}
        - Years of Experience: {employee_persona.get('years_of_experience')}
        - Education/Qualification: {employee_persona.get('highest_qualification')}
        - Clinical Spec: {employee_persona.get('clinical_specialization')}
        - Grade Band: {employee_persona.get('grade_band')}
        - Project Status: {employee_persona.get('project_status')}
        - Fit Score for Target Role: {employee_persona.get('fit_score_for_target_role')}%
        
        EMPLOYEE SKILLS & TEST EVIDENCES:
        - Aggregated Skills: {json.dumps(employee_persona.get('aggregated_skills'))}
        - Test & Source Evidences (from Assessments, GitHub, Jira, etc.): {json.dumps(employee_persona.get('skill_test_evidences'))}
        - Identified Gaps for Target Role: {json.dumps(employee_persona.get('identified_gaps_for_target_role'))}
        
        TARGET ROLE (For Hiring/Upskilling):
        - Title: {job_description.get('title')}
        - Role Type: {job_description.get('role_type')}
        - Requirements: {job_description.get('requirements')}
        
        MARKET & COST DATA:
        - Average cost to hire externally (sourcing, onboarding): {market_data.get('avg_hire_cost')}
        - Average time to hire externally: {market_data.get('avg_hire_time_months')} months
        - Average certification/training cost for gaps: {market_data.get('avg_training_cost')}
        - Current employee salary estimate: {employee_persona.get('salary_estimate', 'Unknown')}
        - Target role market salary: {market_data.get('market_salary', 'Unknown')}
        
        INSTRUCTIONS:
        1. Consider the complete employee persona: their background, education, and years of experience to assess their 'trainability'.
        2. Evaluate the 'Test & Source Evidences' to understand their true current skill level from various sources (assessments, peer reviews, technical tools like GitHub/Jira).
        3. Compare the existing gaps with the time/cost to train them versus hiring a brand new employee. Ensure you research/estimate realistic market rates.
        4. Make a 'decision' (must be exactly "Hire" or "Upskill").
        5. Estimate 'upskill_cost_estimate' (numeric, realistic based on current market training costs for the gaps).
        6. Estimate 'hire_cost_estimate' (numeric, realistic including recruitment fees 15-20% and onboarding).
        7. Estimate 'time_to_upskill_months' (numeric).
        8. Estimate 'time_to_hire_months' (numeric).
        9. Provide a detailed 'reasoning'. **CRITICAL FORMATTING**: You MUST format the reasoning as Markdown bullet points (`- point`). DO NOT output a single paragraph. Include the following specific points in your output:
           - **Employee Skill Gaps**: Detail what is missing.
           - **Skills to Learn**: Exact skills they need to learn to match the required skill set.
           - **Estimated Time**: Breakdown of time to upskill vs hire.
           - **Cost Factors**: Breakdown of why the cost is estimated as such.
           - **Final Verdict**: Why this decision is optimal.
        10. Return valid JSON matching the HireVsUpskillResult schema.
        """
        
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=HireVsUpskillResult
                )
            )
            return HireVsUpskillResult.model_validate_json(response.text)
        except Exception as e:
            logger.error(f"Error analyzing hire vs upskill: {e}")
            return None

