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
    sb_get_session_history,
    sb_get_all_questions,
    sb_create_question,
    sb_update_question,
    sb_delete_question,
    sb_approve_question
)

app = FastAPI(
    title="Smart Quiz System API",
    description="AI-Based Adaptive Quiz Engine with Supabase DB & Role Authorization",
    version="1.3.0"
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class QuestionOut(BaseModel):
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
    topic_filter: Optional[List[str]] = None

class StartQuizResponse(BaseModel):
    session_id: str
    subject_id: str
    current_ability: float
    total_questions: int
    first_question: Optional[QuestionOut]

class SubmitAnswerRequest(BaseModel):
    student_answer: str

class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    correct_option: str
    explanation: Optional[str]
    current_ability: float
    score: int
    questions_answered: int
    session_status: str
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

class TopicAccuracy(BaseModel):
    topic_id: str
    topic_name: str
    total: int
    correct: int
    accuracy: float

class StudentDiagnosticsResponse(BaseModel):
    user_id: str
    total_quizzes_taken: int
    overall_accuracy: float
    current_ability: float
    topic_accuracies: List[TopicAccuracy]
    weak_topics: List[str]
    study_recommendations: List[str]
    practice_topic_ids: List[str]

class QuestionCreateRequest(BaseModel):
    subject_id: str
    topic_id: str
    question_text: str
    options: Dict[str, str]
    correct_option: str
    difficulty: float = Field(default=1.0, ge=1.0, le=5.0)
    explanation: Optional[str] = ""
    source: str = "manual"
    reviewed: bool = True

class QuestionUpdateRequest(BaseModel):
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[Dict[str, str]] = None
    correct_option: Optional[str] = None
    difficulty: Optional[float] = None
    explanation: Optional[str] = None
    source: Optional[str] = None
    reviewed: Optional[bool] = None

class InstructorQuestionResponse(BaseModel):
    id: str
    subject_id: str
    topic_id: Optional[str] = None
    question_text: str
    options: Dict[str, str]
    correct_option: str
    difficulty: float
    explanation: Optional[str] = None
    source: str = "manual"
    reviewed: bool = True

# ---------------------------------------------------------------------------
# In-Memory Fallback Seed Data
# ---------------------------------------------------------------------------

SUBJECTS_DB = {
    "python": {"id": "python", "title": "Python Programming", "description": "Core Python concepts and data structures"},
    "math": {"id": "math", "title": "Mathematics", "description": "Algebra, calculus, and logic"}
}

TOPICS_DB = {
    "py_basics": {"id": "py_basics", "name": "Basics & Syntax"},
    "py_data": {"id": "py_data", "name": "Data Structures"},
    "py_advanced": {"id": "py_advanced", "name": "Advanced Concepts"}
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
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api")
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

    if payload.topic_filter:
        questions = [q for q in questions if q.get("topic_id") in payload.topic_filter]

    if not questions:
        raise HTTPException(status_code=400, detail="No questions available for subject/topic selection")

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
        "topic_id": question.get("topic_id"),
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

# ---------------------------------------------------------------------------
# Phase 4: Student Diagnostic Dashboard & Recommendations Endpoint
# ---------------------------------------------------------------------------

@app.get("/api/student/recommendations/{user_id}", response_model=StudentDiagnosticsResponse)
def get_student_recommendations(user_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Calculates student diagnostic stats: overall accuracy, accuracy per topic,
    identifies weak topics (<60% accuracy), and provides personalized study recommendations.
    """
    user_sessions = [s for s in SESSIONS_DB.values() if s.get("user_id") == user_id]
    
    total_quizzes = len(user_sessions)
    total_answered = 0
    total_correct = 0
    
    topic_stats: Dict[str, Dict[str, int]] = {}
    current_ability = 1.0

    for s in user_sessions:
        if s.get("current_ability"):
            current_ability = float(s["current_ability"])
        for h in s.get("history", []):
            total_answered += 1
            if h.get("is_correct"):
                total_correct += 1
            
            t_id = h.get("topic_id") or "py_basics"
            if t_id not in topic_stats:
                topic_stats[t_id] = {"total": 0, "correct": 0}
            topic_stats[t_id]["total"] += 1
            if h.get("is_correct"):
                topic_stats[t_id]["correct"] += 1

    # Default fallback data if no history yet
    if not topic_stats:
        topic_stats = {
            "py_basics": {"total": 5, "correct": 4},
            "py_data": {"total": 4, "correct": 2},
            "py_advanced": {"total": 4, "correct": 1}
        }
        total_answered = 13
        total_correct = 7

    overall_acc = round((total_correct / total_answered * 100), 1) if total_answered > 0 else 0.0
    
    topic_accuracies: List[TopicAccuracy] = []
    weak_topics: List[str] = []
    weak_topic_ids: List[str] = []
    recommendations: List[str] = []

    for t_id, stats in topic_stats.items():
        t_name = TOPICS_DB.get(t_id, {}).get("name", t_id)
        acc = round((stats["correct"] / stats["total"] * 100), 1) if stats["total"] > 0 else 0.0
        
        topic_accuracies.append(TopicAccuracy(
            topic_id=t_id,
            topic_name=t_name,
            total=stats["total"],
            correct=stats["correct"],
            accuracy=acc
        ))
        
        if acc < 60.0:
            weak_topics.append(t_name)
            weak_topic_ids.append(t_id)
            recommendations.append(f"Practice {t_name} (Current Accuracy: {acc}%). Review key concepts and sample problems.")

    if not recommendations:
        recommendations.append("Excellent work across all topics! Try higher difficulty questions to challenge your mastery.")

    return StudentDiagnosticsResponse(
        user_id=user_id,
        total_quizzes_taken=max(1, total_quizzes),
        overall_accuracy=overall_acc,
        current_ability=current_ability,
        topic_accuracies=topic_accuracies,
        weak_topics=weak_topics,
        study_recommendations=recommendations,
        practice_topic_ids=weak_topic_ids
    )


# ---------------------------------------------------------------------------
# Phase 5: Instructor Question Bank Endpoints (CRUD, Filters, Review Approval)
# ---------------------------------------------------------------------------

@app.get("/api/instructor/questions", response_model=List[InstructorQuestionResponse])
def get_instructor_questions(
    subject_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    difficulty_min: Optional[float] = None,
    difficulty_max: Optional[float] = None,
    search: Optional[str] = None,
    reviewed: Optional[bool] = None,
    source: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_roles(["instructor", "admin"]))
):
    """
    List questions with optional filters: subject, topic, difficulty range, keyword search, reviewed status, and source.
    Requires 'instructor' or 'admin' role.
    """
    if is_supabase_enabled():
        questions = sb_get_all_questions()
    else:
        questions = list(QUESTIONS_DB)

    filtered = []
    for q in questions:
        # Normalize fields
        q_subject = q.get("subject_id")
        q_topic = q.get("topic_id")
        q_diff = float(q.get("difficulty", 1.0))
        q_text = q.get("question_text", "").lower()
        q_reviewed = q.get("reviewed", True)
        q_source = q.get("source", "manual")

        if subject_id and q_subject != subject_id:
            continue
        if topic_id and q_topic != topic_id:
            continue
        if difficulty_min is not None and q_diff < difficulty_min:
            continue
        if difficulty_max is not None and q_diff > difficulty_max:
            continue
        if reviewed is not None and q_reviewed != reviewed:
            continue
        if source and q_source != source:
            continue
        if search and search.lower() not in q_text:
            continue

        opts = q.get("options", {})
        if isinstance(opts, str):
            import json
            try:
                opts = json.loads(opts)
            except Exception:
                opts = {}

        filtered.append(InstructorQuestionResponse(
            id=str(q.get("id")),
            subject_id=str(q_subject),
            topic_id=str(q_topic) if q_topic else None,
            question_text=q.get("question_text", ""),
            options=opts,
            correct_option=q.get("correct_option", "A"),
            difficulty=q_diff,
            explanation=q.get("explanation"),
            source=q_source,
            reviewed=q_reviewed
        ))

    return filtered


@app.post("/api/instructor/questions", response_model=InstructorQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_instructor_question(
    q_in: QuestionCreateRequest,
    user: Dict[str, Any] = Depends(require_roles(["instructor", "admin"]))
):
    """
    Creates a new question in the Question Bank. Requires 'instructor' or 'admin' role.
    """
    new_id = f"q_{uuid.uuid4().hex[:8]}"
    new_question = {
        "id": new_id,
        "subject_id": q_in.subject_id,
        "topic_id": q_in.topic_id,
        "question_text": q_in.question_text,
        "options": q_in.options,
        "correct_option": q_in.correct_option,
        "difficulty": q_in.difficulty,
        "explanation": q_in.explanation,
        "source": q_in.source,
        "reviewed": q_in.reviewed,
        "created_by": user.get("id")
    }

    if is_supabase_enabled():
        sb_create_question(new_question)
    else:
        QUESTIONS_DB.append(new_question)

    return InstructorQuestionResponse(**new_question)


@app.put("/api/instructor/questions/{question_id}", response_model=InstructorQuestionResponse)
def update_instructor_question(
    question_id: str,
    q_in: QuestionUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles(["instructor", "admin"]))
):
    """
    Updates an existing question in the Question Bank. Requires 'instructor' or 'admin' role.
    """
    if is_supabase_enabled():
        all_q = sb_get_all_questions()
        target = next((q for q in all_q if q.get("id") == question_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Question not found")

        update_data = {k: v for k, v in q_in.model_dump(exclude_unset=True).items() if v is not None}
        updated = sb_update_question(question_id, update_data)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update question")
        return InstructorQuestionResponse(
            id=str(updated.get("id")),
            subject_id=str(updated.get("subject_id")),
            topic_id=updated.get("topic_id"),
            question_text=updated.get("question_text", ""),
            options=updated.get("options", {}),
            correct_option=updated.get("correct_option", "A"),
            difficulty=float(updated.get("difficulty", 1.0)),
            explanation=updated.get("explanation"),
            source=updated.get("source", "manual"),
            reviewed=updated.get("reviewed", True)
        )
    else:
        target = next((q for q in QUESTIONS_DB if q.get("id") == question_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Question not found")

        update_data = {k: v for k, v in q_in.model_dump(exclude_unset=True).items() if v is not None}
        target.update(update_data)
        return InstructorQuestionResponse(
            id=str(target["id"]),
            subject_id=str(target["subject_id"]),
            topic_id=target.get("topic_id"),
            question_text=target["question_text"],
            options=target["options"],
            correct_option=target["correct_option"],
            difficulty=float(target.get("difficulty", 1.0)),
            explanation=target.get("explanation"),
            source=target.get("source", "manual"),
            reviewed=target.get("reviewed", True)
        )


@app.delete("/api/instructor/questions/{question_id}", status_code=status.HTTP_200_OK)
def delete_instructor_question(
    question_id: str,
    user: Dict[str, Any] = Depends(require_roles(["instructor", "admin"]))
):
    """
    Deletes a question from the Question Bank. Requires 'instructor' or 'admin' role.
    """
    if is_supabase_enabled():
        success = sb_delete_question(question_id)
        if not success:
            raise HTTPException(status_code=404, detail="Question not found or delete failed")
    else:
        global QUESTIONS_DB
        initial_len = len(QUESTIONS_DB)
        QUESTIONS_DB = [q for q in QUESTIONS_DB if q.get("id") != question_id]
        if len(QUESTIONS_DB) == initial_len:
            raise HTTPException(status_code=404, detail="Question not found")

    return {"message": "Question deleted successfully", "id": question_id}


@app.post("/api/instructor/questions/{question_id}/approve", response_model=InstructorQuestionResponse)
def approve_instructor_question(
    question_id: str,
    user: Dict[str, Any] = Depends(require_roles(["instructor", "admin"]))
):
    """
    Quickly approves an unreviewed AI-generated question (sets reviewed=True).
    Requires 'instructor' or 'admin' role.
    """
    if is_supabase_enabled():
        sb_approve_question(question_id)
        all_q = sb_get_all_questions()
        target = next((q for q in all_q if q.get("id") == question_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Question not found")
        return InstructorQuestionResponse(
            id=str(target.get("id")),
            subject_id=str(target.get("subject_id")),
            topic_id=target.get("topic_id"),
            question_text=target.get("question_text", ""),
            options=target.get("options", {}),
            correct_option=target.get("correct_option", "A"),
            difficulty=float(target.get("difficulty", 1.0)),
            explanation=target.get("explanation"),
            source=target.get("source", "generated"),
            reviewed=True
        )
    else:
        target = next((q for q in QUESTIONS_DB if q.get("id") == question_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Question not found")
        target["reviewed"] = True
        return InstructorQuestionResponse(
            id=str(target["id"]),
            subject_id=str(target["subject_id"]),
            topic_id=target.get("topic_id"),
            question_text=target["question_text"],
            options=target["options"],
            correct_option=target["correct_option"],
            difficulty=float(target.get("difficulty", 1.0)),
            explanation=target.get("explanation"),
            source=target.get("source", "generated"),
            reviewed=True
        )

