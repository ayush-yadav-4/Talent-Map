import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

class GapAnalysisService:
    @staticmethod
    def calculate_priority_score(
        gap_magnitude: float,
        criticality: str, # essential, important, nice_to_have
        expiry_date: Optional[datetime] = None,
        is_compliance: bool = False
    ) -> float:
        """
        priority_score = gap_magnitude x criticality_weight x urgency_factor
        """
        # Criticality weight
        criticality_weights = {
            "essential": 2.0,
            "important": 1.0,
            "nice_to_have": 0.5
        }
        weight = criticality_weights.get(criticality, 1.0)
        
        # Urgency factor
        urgency_factor = 1.0
        if expiry_date:
            days_to_expiry = (expiry_date - datetime.now(timezone.utc)).days
            if days_to_expiry < 0:
                urgency_factor = 2.0
            elif days_to_expiry <= 7:
                urgency_factor = 1.8
            elif days_to_expiry <= 30:
                urgency_factor = 1.5
            elif days_to_expiry <= 90:
                urgency_factor = 1.2
        
        if is_compliance:
            urgency_factor = max(urgency_factor, 1.5)
            
        return gap_magnitude * weight * urgency_factor

    @staticmethod
    def calculate_role_readiness(
        required_skills: List[Dict[str, Any]], # List of {skill_id, required_prof, criticality, current_prof}
    ) -> float:
        """
        readiness_pct = (Σ(skill_fulfillment × criticality_weight) / Σ(criticality_weight)) × 100
        """
        if not required_skills:
            return 100.0
            
        criticality_weights = {
            "essential": 2.0,
            "important": 1.0,
            "nice_to_have": 0.5
        }
        
        total_fulfillment_weight = 0.0
        total_possible_weight = 0.0
        
        for skill in required_skills:
            req = skill['required_prof']
            curr = skill.get('current_prof', 0.0)
            weight = criticality_weights.get(skill['criticality'], 1.0)
            
            fulfillment = 0.0
            if curr >= req:
                fulfillment = 1.0
            elif curr > 0:
                fulfillment = curr / req
                
            total_fulfillment_weight += fulfillment * weight
            total_possible_weight += weight
            
        if total_possible_weight == 0:
            return 100.0
            
        return (total_fulfillment_weight / total_possible_weight) * 100.0

    @staticmethod
    def generate_recommended_actions(
        skill_name: str,
        current_prof: float,
        required_prof: float,
        is_compliance: bool = False
    ) -> List[str]:
        """
        Generates actionable recommendations based on gap level.
        """
        actions = []
        
        if current_prof == 0:
            actions.append(f"Take the {skill_name} assessment to establish your current level.")
            return actions
            
        if current_prof < required_prof:
            if current_prof < 2.5:
                actions.append(f"Enroll in foundational training for {skill_name}.")
            elif current_prof < 3.5:
                actions.append(f"Apply this skill in project work. Consider peer mentoring.")
            
            if is_compliance:
                actions.append(f"This skill is mandatory. Complete the required certification.")
                
        return actions

    @staticmethod
    async def recompute_employee_skills(
        employee_id: uuid.UUID,
        db: AsyncSession
    ):
        """
        1. Fetch all evidence for this employee.
        2. Group by skill.
        3. Use SkillScoring service to calculate new proficiency.
        4. Update EmployeeSkillScore table.
        5. Re-check against RoleRequiredSkill to update SkillGap table.
        """
        from app.models.analytics import SkillEvidence, EmployeeSkillScore, RoleRequiredSkill, SkillGap
        from app.models.employee import Employee
        from app.services.skill_scoring import compute_weighted_skill_score
        
        # 1. Fetch evidence
        ev_query = select(SkillEvidence).where(SkillEvidence.employee_id == employee_id, SkillEvidence.is_active == True)
        ev_result = await db.execute(ev_query)
        all_evidence = ev_result.scalars().all()
        
        # Group by skill
        evidence_by_skill = {}
        for ev in all_evidence:
            if ev.skill_id not in evidence_by_skill:
                evidence_by_skill[ev.skill_id] = []
            evidence_by_skill[ev.skill_id].append({
                "proficiency_raw": ev.proficiency_raw,
                "confidence_weight": ev.confidence_weight,
                "decay_half_life_days": ev.decay_half_life_days,
                "observed_at": ev.observed_at,
                "source_type": ev.source_type
            })
            
        # 2 & 3 & 4. Update scores
        for skill_id, records in evidence_by_skill.items():
            result = compute_weighted_skill_score(records)
            
            # Upsert EmployeeSkillScore
            score_query = select(EmployeeSkillScore).where(
                EmployeeSkillScore.employee_id == employee_id,
                EmployeeSkillScore.skill_id == skill_id
            )
            score_res = await db.execute(score_query)
            score = score_res.scalar_one_or_none()
            
            if not score:
                score = EmployeeSkillScore(
                    employee_id=employee_id,
                    skill_id=skill_id
                )
                db.add(score)
            
            score.proficiency_score = result['proficiency_score']
            score.proficiency_level = result['proficiency_level']
            score.confidence = result['confidence']
            score.source_diversity = result['source_diversity']
            score.last_evidence_at = max(r['observed_at'] for r in records)
            
        # 5. Gap Analysis
        emp = await db.get(Employee, employee_id)
        # Some deployments use Employee without role_profile_id.
        # Guard this access so assessment submission never crashes.
        role_profile_id = getattr(emp, "role_profile_id", None) if emp else None
        if role_profile_id:
            req_query = select(RoleRequiredSkill).where(RoleRequiredSkill.role_profile_id == role_profile_id)
            req_res = await db.execute(req_query)
            requirements = req_res.scalars().all()
            
            for req in requirements:
                curr_score_query = select(EmployeeSkillScore).where(
                    EmployeeSkillScore.employee_id == employee_id,
                    EmployeeSkillScore.skill_id == req.skill_id
                )
                curr_res = await db.execute(curr_score_query)
                curr_score = curr_res.scalar_one_or_none()
                
                curr_val = curr_score.proficiency_score if curr_score else 0.0
                gap_magnitude = max(0.0, req.required_proficiency - curr_val)
                
                gap_query = select(SkillGap).where(
                    SkillGap.employee_id == employee_id,
                    SkillGap.skill_id == req.skill_id,
                    SkillGap.status == "open"
                )
                gap_res = await db.execute(gap_query)
                gap = gap_res.scalar_one_or_none()
                
                if gap_magnitude > 0:
                    if not gap:
                        gap = SkillGap(
                            employee_id=employee_id,
                            skill_id=req.skill_id,
                            role_profile_id=role_profile_id
                        )
                        db.add(gap)
                    
                    gap.gap_magnitude = gap_magnitude
                    gap.priority_score = GapAnalysisService.calculate_priority_score(
                        gap_magnitude, req.criticality, is_compliance=req.is_compliance
                    )
                elif gap:
                    gap.status = "closed"
                    gap.closed_at = datetime.now(timezone.utc)
        
        await db.commit()
