from typing import List, Dict, Any
import numpy as np
from app.services.gemini_service import GeminiService

class MatchingService:
    @staticmethod
    def calculate_match_score(
        employee_skills: List[Dict[str, Any]], 
        role_skills: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates a match score between an employee's skills and a role's requirements.
        
        employee_skills: List of {"name": str, "proficiency": float}
        role_skills: List of {"name": str, "required_proficiency": float, "criticality": str}
        """
        if not role_skills:
            # Keep both keys for backward compatibility across callers.
            return {"overall_score": 0.0, "score": 0.0, "gaps": [], "matches": []}

        total_weight = 0
        earned_weight = 0
        gaps = []
        matches = []

        # Create a lookup for employee skills
        emp_skill_map = {s["name"].lower(): s["proficiency"] for s in employee_skills}

        for rs in role_skills:
            skill_name = rs["name"]
            req_prof = rs["required_proficiency"]
            # Essential skills have higher weight
            weight = 2.0 if rs["criticality"] == "essential" else 1.0
            total_weight += weight
            
            emp_prof = emp_skill_map.get(skill_name.lower(), 0.0)
            
            if emp_prof >= req_prof:
                # Full match for this skill
                earned_weight += weight
                matches.append({
                    "skill": skill_name,
                    "status": "matched",
                    "employee_proficiency": emp_prof,
                    "required_proficiency": req_prof
                })
            elif emp_prof > 0:
                # Partial match
                partial_score = emp_prof / req_prof
                earned_weight += weight * partial_score
                gaps.append({
                    "skill": skill_name,
                    "status": "partial",
                    "employee_proficiency": emp_prof,
                    "required_proficiency": req_prof,
                    "gap": req_prof - emp_prof
                })
            else:
                # Missing skill
                gaps.append({
                    "skill": skill_name,
                    "status": "missing",
                    "employee_proficiency": 0,
                    "required_proficiency": req_prof,
                    "gap": req_prof
                })

        final_score = (earned_weight / total_weight) * 100 if total_weight > 0 else 0
        
        return {
            "overall_score": round(final_score, 1),
            "score": round(final_score, 1),
            "matches": matches,
            "gaps": gaps
        }
