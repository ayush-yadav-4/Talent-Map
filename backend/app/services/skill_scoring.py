import math
from datetime import datetime, timezone
from typing import List, Dict, Any

def calculate_decay_factor(observed_at: datetime, half_life_days: int) -> float:
    """
    decay_factor = e^(−ln(2) × days_elapsed / half_life)
    """
    days_elapsed = (datetime.now(timezone.utc) - observed_at).total_seconds() / (24 * 3600)
    days_elapsed = max(0, days_elapsed)
    return math.exp(-math.log(2) * days_elapsed / half_life_days)

def compute_weighted_skill_score(
    evidence_records: List[Dict[str, Any]] # List of {proficiency_raw, confidence_weight, decay_half_life_days, observed_at, source_type}
) -> Dict[str, Any]:
    """
    Compute final proficiency score and confidence from multiple evidence records.
    """
    if not evidence_records:
        return {
            "proficiency_score": 0.0,
            "proficiency_level": "none",
            "confidence": 0.0,
            "source_diversity": 0
        }

    total_weighted_proficiency = 0.0
    total_effective_weight = 0.0
    unique_sources = set()

    for record in evidence_records:
        observed_at = record['observed_at']
        if observed_at.tzinfo is None:
            observed_at = observed_at.replace(tzinfo=timezone.utc)
            
        decay_factor = calculate_decay_factor(observed_at, record['decay_half_life_days'])
        effective_weight = record['confidence_weight'] * decay_factor
        
        total_weighted_proficiency += record['proficiency_raw'] * effective_weight
        total_effective_weight += effective_weight
        unique_sources.add(record['source_type'])

    if total_effective_weight == 0:
        return {
            "proficiency_score": 0.0,
            "proficiency_level": "none",
            "confidence": 0.0,
            "source_diversity": 0
        }

    final_proficiency = total_weighted_proficiency / total_effective_weight
    final_proficiency = max(1.0, min(5.0, final_proficiency))
    
    # Confidence: calibrated so roughly 5 high-confidence pieces (total wt ~5) gives 1.0 confidence
    confidence = min(1.0, total_effective_weight / 5.0)
    
    # Map to level
    if final_proficiency < 1.5:
        level = "awareness"
    elif final_proficiency < 2.5:
        level = "basic"
    elif final_proficiency < 3.5:
        level = "proficient"
    elif final_proficiency < 4.5:
        level = "advanced"
    else:
        level = "expert"

    return {
        "proficiency_score": round(final_proficiency, 2),
        "proficiency_level": level,
        "confidence": round(confidence, 2),
        "source_diversity": len(unique_sources)
    }

# Confidence weight constants as per requirements
CONFIDENCE_WEIGHTS = {
    "assessment": 0.90,
    "github": 0.90,
    "machine_log": 0.80,
    "manager_review": 0.75,
    "jira": 0.75,
    "clinical_record": 0.72,
    "peer_mention": 0.70,
    "teams_action_item": 0.70,
    "sop_assessment": 0.70,
    "gov_apar": 0.68,
    "lms_certification_exam": 0.65,
    "teams_domain_vocab": 0.65,
    "email_metadata": 0.45,
    "lms_course_completion": 0.40,
    "self_onboarding": 0.30,
}

# Decay half-life constants as per requirements
HALF_LIFE_DAYS = {
    "assessment": 365,
    "github": 180,
    "jira": 180,
    "machine_log": 120,
    "manager_review": 365,
    "clinical_record": 180,
    "peer_mention": 90,
    "teams_action_item": 90,
    "email_metadata": 90,
    "lms_certification": 730,
    "self_onboarding": 1095,
    "resume": 1095,
}
