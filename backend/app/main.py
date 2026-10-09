from fastapi import FastAPI, HTTPException, Depends, Header, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid

from app.adaptive import select_next_question, update_student_ability
from app.auth import get_current_user, require_roles
from app.database import (
    is_supabase_enabled,
    sb_get_subject,
    sb_get_questions_for_subject,
    sb_create_session,
    sb_get_session,
    sb_update_session,
    sb_record_session_question,
    sb_get_session_history
)

app = FastAPI(
    title="Smart Quiz System API",
    description="AI-Based Adaptive Quiz Engine with Supabase DB & Role Authorization",
    version="1.2.0"
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class QuestionOut(BaseModel):
    """
    Public Question Schema sent to student/browser.
    SECURITY RULE: Must NEVER contain correct_option or explanation before student answers!
    """
    id: str
    subject_id: str
    topic_id: Optional[str] = None
    question_text: str
    options: Dict[str, str]
    difficulty: float

class StartQuizRequest(BaseModel):
    subject_id: str
    total_questions: int = Field(default=5, ge=1, le=20)
    user_id: Optional[str] = None

class StartQuizResponse(BaseModel):
    session_id: str
    subject_id: str
    current_ability: float
    total_questions: int
    first_question: Optional[QuestionOut]

class SubmitAnswerRequest(BaseModel):
    student_answer: str  # e.g., "A", "B", "C", "D"

class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    correct_option: str
    explanation: Optional[str]
    current_ability: float
    score: int
    questions_answered: int
    session_status: str  # "in_progress" or "completed"
    next_question: Optional[QuestionOut]

class QuizResultResponse(BaseModel):
    session_id: str
    user_id: str
    subject_id: str
    final_ability: float
    score: int
    total_questions: int
    status: str
    history: List[Dict[str, Any]]

# ---------------------------------------------------------------------------
# In-Memory Fallback Seed Data
# ---------------------------------------------------------------------------

SUBJECTS_DB = {
    "python": {"id": "python", "title": "Python Programming", "description": "Core Python concepts and data structures"},
    "math": {"id": "math", "title": "Mathematics", "description": "Algebra, calculus, and logic"}
}

QUESTIONS_DB: List[Dict[str, Any]] = [
    {
        "id": "py_1",
        "subject_id": "python",
        "topic_id": "py_basics",
        "question_text": "What keyword is used to define a function in Python?",
        "options": {"A": "func", "B": "def", "C": "function", "D": "lambda"},
        "correct_option": "B",
        "difficulty": 1.0,
        "explanation": "'def' is used to define functions in Python."
    },
    {
        "id": "py_2",
        "subject_id": "python",
        "topic_id": "py_data",
        "question_text": "Which data structure is immutable in Python?",
        "options": {"A": "List", "B": "Dictionary", "C": "Tuple", "D": "Set"},
        "correct_option": "C",
        "difficulty": 2.0,
        "explanation": "Tuples cannot be modified after creation."
    },
    {
        "id": "py_3",
        "subject_id": "python",
        "topic_id": "py_data",
        "question_text": "What is the time complexity of looking up a key in a Python dictionary average case?",
        "options": {"A": "O(1)", "B": "O(n)", "C": "O(log n)", "D": "O(n^2)"},
        "correct_option": "A",
        "difficulty": 3.0,
        "explanation": "Dictionary lookups take O(1) average time due to hashing."
    },
    {
        "id": "py_4",
        "subject_id": "python",
        "topic_id": "py_advanced",
        "question_text": "What does the @classmethod decorator do in Python?",
        "options": {
            "A": "Makes method static",
            "B": "Passes class as first argument (cls)",
            "C": "Makes method private",
            "D": "Executes method on instantiation"
        },
        "correct_option": "B",
        "difficulty": 4.0,
        "explanation": "@classmethod receives the class object as its first positional parameter."
    },
    {
        "id": "py_5",
        "subject_id": "python",
        "topic_id": "py_advanced",
        "question_text": "What mechanism does CPython use for automatic memory management alongside reference counting?",
        "options": {
            "A": "Mark-and-Sweep Garbage Collector",
            "B": "Generational Cyclic Garbage Collector",
            "C": "Manual Malloc/Free",
            "D": "Stop-the-World GC"
        },
        "correct_option": "B",
        "difficulty": 5.0,
        "explanation": "CPython uses reference counting supplemented by a generational cyclic garbage collector."
    }
]

SESSIONS_DB: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def sanitize_question_for_client(question: Dict[str, Any]) -> QuestionOut:
    """
    Ensures correct_option and explanation are stripped before sending to client.
    """
    opts = question["options"]
    if isinstance(opts, str):
        import json
        opts = json.loads(opts)
        
    return QuestionOut(
        id=question["id"],
        subject_id=question["subject_id"],
        topic_id=question.get("topic_id"),
        question_text=question["question_text"],
        options=opts,
        difficulty=float(question["difficulty"])
    )

# ---------------------------------------------------------------------------
# Core Quiz Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "app": "Smart Quiz System API",
        "status": "online",
        "supabase_connected": is_supabase_enabled()
    }

@app.post("/quiz/start", response_model=StartQuizResponse, status_code=status.HTTP_201_CREATED)
@app.post("/api/quiz/start", response_model=StartQuizResponse, status_code=status.HTTP_201_CREATED)
def start_quiz(payload: StartQuizRequest, user: Dict[str, Any] = Depends(get_current_user)):
    user_id = payload.user_id or user.get("id", "student_user")

    if is_supabase_enabled():
        subject = sb_get_subject(payload.subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        questions = sb_get_questions_for_subject(payload.subject_id)
    else:
        if payload.subject_id not in SUBJECTS_DB:
            raise HTTPException(status_code=404, detail="Subject not found")
        questions = [q for q in QUESTIONS_DB if q["subject_id"] == payload.subject_id]

    if not questions:
        raise HTTPException(status_code=400, detail="No questions available for subject")

    session_id = str(uuid.uuid4())
    initial_ability = 1.0
    first_q = select_next_question(questions, [], initial_ability)

    session_data = {
        "id": session_id,
        "user_id": user_id,
        "subject_id": payload.subject_id,
        "current_ability": initial_ability,
        "total_questions": payload.total_questions,
        "questions_answered": 0,
        "score": 0,
        "status": "in_progress",
        "asked_question_ids": [first_q["id"]] if first_q else [],
        "current_question_id": first_q["id"] if first_q else None,
        "history": []
    }

    if is_supabase_enabled():
        sb_create_session(session_data)
    else:
        SESSIONS_DB[session_id] = session_data

    return StartQuizResponse(
        session_id=session_id,
        subject_id=payload.subject_id,
        current_ability=initial_ability,
        total_questions=payload.total_questions,
        first_question=sanitize_question_for_client(first_q) if first_q else None
    )


@app.post("/quiz/answer", response_model=SubmitAnswerResponse)
@app.post("/quiz/session/{session_id}/submit", response_model=SubmitAnswerResponse)
@app.post("/api/quiz/session/{session_id}/submit", response_model=SubmitAnswerResponse)
def submit_answer(
    payload: SubmitAnswerRequest, 
    session_id: Optional[str] = None, 
    user: Dict[str, Any] = Depends(get_current_user)
):
    target_session_id = session_id or getattr(payload, 'session_id', None)
    if not target_session_id and hasattr(payload, 'dict'):
        target_session_id = payload.dict().get('session_id')
    
    if not target_session_id and len(SESSIONS_DB) > 0:
        # Fallback to active session for user in testing
        target_session_id = list(SESSIONS_DB.keys())[-1]

    if not target_session_id:
        raise HTTPException(status_code=400, detail="Missing session_id parameter")

    if is_supabase_enabled():
        session = sb_get_session(target_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        questions = sb_get_questions_for_subject(session["subject_id"])
    else:
        session = SESSIONS_DB.get(target_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        questions = [q for q in QUESTIONS_DB if q["subject_id"] == session["subject_id"]]

    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Quiz session is already completed")
    
    current_q_id = session.get("current_question_id")
    if not current_q_id:
        raise HTTPException(status_code=400, detail="No active question in session")

    question = next((q for q in questions if q["id"] == current_q_id), None)
    if not question:
        raise HTTPException(status_code=500, detail="Active question not found")

    is_correct = (payload.student_answer.strip().upper() == question["correct_option"].upper())
    
    new_score = session["score"] + (1 if is_correct else 0)

    # Adaptive ability update
    old_ability = float(session["current_ability"])
    new_ability = update_student_ability(
        current_ability=old_ability,
        is_correct=is_correct,
        question_difficulty=float(question["difficulty"])
    )
    
    questions_answered = session["questions_answered"] + 1
    asked_ids = list(session.get("asked_question_ids") or [])

    history_item = {
        "id": str(uuid.uuid4()),
        "session_id": target_session_id,
        "question_id": question["id"],
        "student_answer": payload.student_answer,
        "is_correct": is_correct,
        "difficulty_at_time": float(question["difficulty"]),
        "order_index": questions_answered
    }

    if questions_answered >= session["total_questions"]:
        new_status = "completed"
        next_q = None
        next_q_id = None
    else:
        next_q = select_next_question(questions, asked_ids, new_ability)
        if next_q:
            asked_ids.append(next_q["id"])
            next_q_id = next_q["id"]
            new_status = "in_progress"
        else:
            new_status = "completed"
            next_q_id = None

    update_fields = {
        "score": new_score,
        "current_ability": new_ability,
        "questions_answered": questions_answered,
        "status": new_status,
        "current_question_id": next_q_id,
        "asked_question_ids": asked_ids
    }

    if is_supabase_enabled():
        sb_update_session(target_session_id, update_fields)
        sb_record_session_question(history_item)
    else:
        session.update(update_fields)
        session.setdefault("history", []).append(history_item)

    return SubmitAnswerResponse(
        is_correct=is_correct,
        correct_option=question["correct_option"],
        explanation=question.get("explanation"),
        current_ability=new_ability,
        score=new_score,
        questions_answered=questions_answered,
        session_status=new_status,
        next_question=sanitize_question_for_client(next_q) if next_q else None
    )


@app.get("/quiz/{session_id}/report", response_model=QuizResultResponse)
@app.get("/api/quiz/session/{session_id}/result", response_model=QuizResultResponse)
def get_quiz_result(session_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if is_supabase_enabled():
        session = sb_get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        history = sb_get_session_history(session_id)
    else:
        session = SESSIONS_DB.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        history = session.get("history", [])

    return QuizResultResponse(
        session_id=session["id"],
        user_id=session["user_id"],
        subject_id=session["subject_id"],
        final_ability=float(session["current_ability"]),
        score=session["score"],
        total_questions=session["total_questions"],
        status=session["status"],
        history=history
    )
