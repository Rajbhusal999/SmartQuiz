import pytest
from app.adaptive import select_next_question, update_student_ability

def test_select_next_question_closest_difficulty():
    questions = [
        {"id": "q1", "difficulty": 1.0},
        {"id": "q2", "difficulty": 2.5},
        {"id": "q3", "difficulty": 4.0},
    ]
    # At ability 2.0, q2 (diff 2.5, dist 0.5) is closer than q1 (dist 1.0)
    selected = select_next_question(questions, asked_question_ids=[], current_ability=2.0)
    assert selected is not None
    assert selected["id"] == "q2"

def test_select_next_question_ignores_asked():
    questions = [
        {"id": "q1", "difficulty": 1.0},
        {"id": "q2", "difficulty": 2.5},
    ]
    selected = select_next_question(questions, asked_question_ids=["q2"], current_ability=2.5)
    assert selected is not None
    assert selected["id"] == "q1"

def test_update_student_ability_correct():
    initial = 2.0
    new_ability = update_student_ability(current_ability=initial, is_correct=True, question_difficulty=2.0)
    assert new_ability > initial
    assert new_ability == 2.5

def test_update_student_ability_incorrect():
    initial = 2.0
    new_ability = update_student_ability(current_ability=initial, is_correct=False, question_difficulty=2.0)
    assert new_ability < initial
    assert new_ability == 1.5

def test_update_student_ability_clamping():
    # Max clamp test
    high_ability = update_student_ability(current_ability=4.8, is_correct=True, question_difficulty=5.0, max_ability=5.0)
    assert high_ability <= 5.0
    
    # Min clamp test
    low_ability = update_student_ability(current_ability=1.2, is_correct=False, question_difficulty=1.0, min_ability=1.0)
    assert low_ability >= 1.0
