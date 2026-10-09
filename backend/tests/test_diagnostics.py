import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_student_recommendations_endpoint():
    response = client.get("/api/student/recommendations/test_student_123")
    assert response.status_code == 200
    data = response.json()
    
    assert "user_id" in data
    assert "overall_accuracy" in data
    assert "topic_accuracies" in data
    assert "weak_topics" in data
    assert "study_recommendations" in data
    assert "practice_topic_ids" in data
    
    assert isinstance(data["topic_accuracies"], list)
    assert len(data["topic_accuracies"]) > 0

def test_diagnostics_weak_topics_detection():
    response = client.get("/api/student/recommendations/student_demo")
    data = response.json()
    
    # Verify topic accuracy structure
    for topic in data["topic_accuracies"]:
        assert "topic_id" in topic
        assert "accuracy" in topic
        assert 0.0 <= topic["accuracy"] <= 100.0

    # Verify recommendations exist for weak topics
    if len(data["weak_topics"]) > 0:
        assert len(data["study_recommendations"]) > 0
        assert len(data["practice_topic_ids"]) > 0
