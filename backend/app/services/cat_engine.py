import math
import numpy as np
from typing import List, Tuple, Optional
from uuid import UUID

def irt_3pl_prob(theta: float, a: float, b: float, c: float) -> float:
    """
    3-Parameter Logistic (3-PL) model probability.
    P(theta) = c + (1 - c) / (1 + exp(-1.702 * a * (theta - b)))
    """
    return c + (1 - c) / (1 + math.exp(-1.702 * a * (theta - b)))

def get_fisher_information(theta: float, a: float, b: float, c: float) -> float:
    """
    Fisher Information for 3-PL model.
    info(theta) = [a^2 * (P(theta) - c)^2 * (1 - P(theta))] / [(1 - c)^2 * P(theta)]
    """
    p = irt_3pl_prob(theta, a, b, c)
    num = (a**2) * ((p - c)**2) * (1 - p)
    den = ((1 - c)**2) * p
    return num / den if den != 0 else 0

def update_theta_eap(
    responses: List[Tuple[int, float, float, float]], # (is_correct, a, b, c)
    prior_mean: float = 0.0,
    prior_std: float = 1.0,
    grid_points: int = 161,
    theta_min: float = -4.0,
    theta_max: float = 4.0
) -> Tuple[float, float]:
    """
    Update theta estimate using Expected A Posteriori (EAP).
    Returns (new_theta, new_se).
    """
    # Create theta grid
    theta_grid = np.linspace(theta_min, theta_max, grid_points)
    
    # Prior distribution (Standard Normal distribution)
    prior = np.exp(-0.5 * ((theta_grid - prior_mean) / prior_std)**2)
    prior /= np.sum(prior)
    
    # Likelihood of observing responses
    likelihood = np.ones(grid_points)
    for is_correct, a, b, c in responses:
        item_probs = np.array([irt_3pl_prob(t, a, b, c) for t in theta_grid])
        if is_correct:
            likelihood *= item_probs
        else:
            likelihood *= (1 - item_probs)
            
    # Posterior
    posterior = likelihood * prior
    post_sum = np.sum(posterior)
    if post_sum == 0:
        return prior_mean, prior_std # Fallback
        
    posterior /= post_sum
    
    # EAP Theta (expected value)
    new_theta = np.sum(theta_grid * posterior)
    
    # EAP Standard Error
    new_se = math.sqrt(np.sum(((theta_grid - new_theta)**2) * posterior))
    
    return float(new_theta), float(new_se)

def select_next_item(
    current_theta: float,
    candidate_items: List[dict], # List of {id, a, b, c}
) -> Optional[UUID]:
    """
    Select the item with the highest Fisher Information at current_theta.
    """
    if not candidate_items:
        return None
        
    best_item_id = None
    max_info = -1.0
    
    for item in candidate_items:
        info = get_fisher_information(current_theta, item['a'], item['b'], item['c'])
        if info > max_info:
            max_info = info
            best_item_id = item['id']
            
    return best_item_id

def theta_to_proficiency(theta: float) -> float:
    """
    Maps theta (-3.0 to 3.0) to proficiency (1.0 to 5.0).
    theta = ((proficiency - 1) / 4) * 6 - 3
    proficiency = ((theta + 3) / 6) * 4 + 1
    """
    proficiency = ((theta + 3) / 6) * 4 + 1
    return max(1.0, min(5.0, proficiency))

def proficiency_to_theta(proficiency: float) -> float:
    """
    Maps proficiency (1.0 to 5.0) to theta (-3.0 to 3.0).
    """
    theta = ((proficiency - 1) / 4) * 6 - 3
    return max(-3.0, min(3.0, theta))
