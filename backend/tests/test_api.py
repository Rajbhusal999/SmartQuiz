import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_start_quiz_session():
    response = client.post("/api/quiz/start", json={
        "user_id": "student_123",
        "subject_id": "python",
        "total_questions": 3
    })
    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert data["subject_id"] == "python"
    assert data["total_questions"] == 3
    assert data["first_question"] is not None

def test_security_correct_answers_never_sent_in_question_payload():
    """
    CRITICAL SECURITY VERIFICATION:
    Ensure correct_option and explanation are NEVER present in question objects sent before student answers!
    """
    start_resp = client.post("/api/quiz/start", json={
        "user_id": "student_sec",
        "subject_id": "python",
        "total_questions": 2
    })
    data = start_resp.json()
    first_q = data["first_question"]

    # Verify field exclusion for first question
    assert "correct_option" not in first_q, "SECURITY VIOLATION: correct_option was exposed to the client!"
    assert "correct_answer" not in first_q, "SECURITY VIOLATION: correct_answer was exposed to the client!"
    assert "explanation" not in first_q, "SECURITY VIOLATION: explanation was exposed to the client!"

    # Submit an answer to get next_question payload
    session_id = data["session_id"]
    submit_resp = client.post(f"/api/quiz/session/{session_id}/submit", json={"student_answer": "B"})
    submit_data = submit_resp.json()
    next_q = submit_data.get("next_question")

    if next_q:
        # Verify field exclusion for next question
        assert "correct_option" not in next_q, "SECURITY VIOLATION: correct_option was exposed in next_question!"
        assert "correct_answer" not in next_q, "SECURITY VIOLATION: correct_answer was exposed in next_question!"
        assert "explanation" not in next_q, "SECURITY VIOLATION: explanation was exposed in next_question!"

def test_submit_answer_and_adaptive_progression():
    start_resp = client.post("/api/quiz/start", json={
        "user_id": "student_prog",
        "subject_id": "python",
        "total_questions": 2
    })
    session_id = start_resp.json()["session_id"]
    initial_ability = start_resp.json()["current_ability"]

    # Submit correct answer ('B' for py_1)
    submit_resp = client.post(f"/api/quiz/session/{session_id}/submit", json={"student_answer": "B"})
    assert submit_resp.status_code == 200
    res_data = submit_resp.json()
    assert res_data["is_correct"] is True
    assert res_data["correct_option"] == "B"
    assert res_data["current_ability"] > initial_ability

def test_quiz_completion_result():
    start_resp = client.post("/api/quiz/start", json={
        "user_id": "student_done",
        "subject_id": "python",
        "total_questions": 1
    })
    session_id = start_resp.json()["session_id"]

    submit_resp = client.post(f"/api/quiz/session/{session_id}/submit", json={"student_answer": "B"})
    assert submit_resp.json()["session_status"] == "completed"

    res_resp = client.get(f"/api/quiz/session/{session_id}/result")
    assert res_resp.status_code == 200
    result_data = res_resp.json()
    assert result_data["status"] == "completed"
    assert len(result_data["history"]) == 1
