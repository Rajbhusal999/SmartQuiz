from typing import List, Dict, Any, Optional

def select_next_question(
    questions: List[Dict[str, Any]],
    asked_question_ids: List[str],
    current_ability: float
) -> Optional[Dict[str, Any]]:
    """
    Selects the next unasked question whose difficulty is closest to the student's current ability.
    """
    unasked = [q for q in questions if q["id"] not in asked_question_ids]
    if not unasked:
        return None
    
    # Sort by absolute distance from student's current ability
    unasked.sort(key=lambda q: (abs(q["difficulty"] - current_ability), q["id"]))
    return unasked[0]


def update_student_ability(
    current_ability: float,
    is_correct: bool,
    question_difficulty: float,
    step_size: float = 0.5,
    min_ability: float = 1.0,
    max_ability: float = 5.0
) -> float:
    """
    Updates the student's ability estimate based on answer correctness and question difficulty.
    - Correct answer: ability increases, scaled if answering a harder question.
    - Incorrect answer: ability decreases, scaled if missing an easier question.
    """
    if is_correct:
        # Increase ability
        bonus = max(0.0, question_difficulty - current_ability) * 0.2
        new_ability = current_ability + step_size + bonus
    else:
        # Decrease ability
        penalty = max(0.0, current_ability - question_difficulty) * 0.2
        new_ability = current_ability - step_size - penalty
    
    # Clamp within allowed ability range
    return max(min_ability, min(max_ability, round(new_ability, 2)))
