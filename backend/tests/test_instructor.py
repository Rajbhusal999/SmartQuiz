import pytest
from fastapi.testclient import TestClient
from app.main import app, QUESTIONS_DB

client = TestClient(app)

# Helper headers for role auth testing
INSTRUCTOR_HEADER = {"Authorization": "Bearer mock_instructor_token"}
STUDENT_HEADER = {"Authorization": "Bearer mock_student_token"}

def test_get_questions_instructor():
    # Fetch questions as instructor
    response = client.get("/api/instructor/questions", headers=INSTRUCTOR_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5

def test_create_question_instructor():
    new_q = {
        "subject_id": "python",
        "topic_id": "py_basics",
        "question_text": "What is the output of print(2 ** 3)?",
        "options": {"A": "6", "B": "8", "C": "9", "D": "5"},
        "correct_option": "B",
        "difficulty": 1.5,
        "explanation": "2 ** 3 calculates 2 raised to power 3, which is 8.",
        "source": "manual",
        "reviewed": True
    }
    response = client.post("/api/instructor/questions", json=new_q, headers=INSTRUCTOR_HEADER)
    assert response.status_code == 201
    data = response.json()
    assert data["question_text"] == new_q["question_text"]
    assert data["correct_option"] == "B"
    assert "id" in data

def test_update_question_instructor():
    # Pick first question from DB
    q_id = QUESTIONS_DB[0]["id"]
    update_payload = {
        "question_text": "Updated question text for testing?",
        "difficulty": 2.5
    }
    response = client.put(f"/api/instructor/questions/{q_id}", json=update_payload, headers=INSTRUCTOR_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["question_text"] == "Updated question text for testing?"
    assert data["difficulty"] == 2.5

def test_approve_question_instructor():
    # Create an unreviewed question first
    unreviewed_q = {
        "subject_id": "python",
        "topic_id": "py_advanced",
        "question_text": "AI generated unreviewed question?",
        "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
        "correct_option": "A",
        "difficulty": 3.0,
        "source": "generated",
        "reviewed": False
    }
    res_create = client.post("/api/instructor/questions", json=unreviewed_q, headers=INSTRUCTOR_HEADER)
    q_id = res_create.json()["id"]

    # Approve question
    response = client.post(f"/api/instructor/questions/{q_id}/approve", headers=INSTRUCTOR_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["reviewed"] is True

def test_delete_question_instructor():
    # Create a temporary question to delete
    temp_q = {
        "subject_id": "python",
        "topic_id": "py_basics",
        "question_text": "Question to be deleted",
        "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
        "correct_option": "A",
        "difficulty": 1.0,
        "reviewed": True
    }
    res_create = client.post("/api/instructor/questions", json=temp_q, headers=INSTRUCTOR_HEADER)
    q_id = res_create.json()["id"]

    # Delete question
    res_del = client.delete(f"/api/instructor/questions/{q_id}", headers=INSTRUCTOR_HEADER)
    assert res_del.status_code == 200

    # Verify deletion
    res_get = client.get("/api/instructor/questions", headers=INSTRUCTOR_HEADER)
    q_ids = [q["id"] for q in res_get.json()]
    assert q_id not in q_ids

def test_instructor_rbac_denied_for_students():
    # Attempting instructor action with student header should return 403 Forbidden
    response = client.get("/api/instructor/questions", headers=STUDENT_HEADER)
    assert response.status_code == 403
