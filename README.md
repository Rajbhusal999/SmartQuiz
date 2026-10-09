# SmartQuiz - Adaptive Quiz Engine

SmartQuiz is an adaptive testing system powered by FastAPI and Supabase/PostgreSQL. It dynamically adjusts quiz question difficulty based on student performance in real time.

## Adaptive Quiz Flow

1. **Quiz Initialization**: When a student starts a quiz session for a subject, the system initializes their estimated ability score (e.g. initial difficulty level = 1.0) and creates a `quiz_session`.
2. **Question Selection**: The adaptive algorithm searches available questions for the subject that haven't been asked in the current session. It selects the question whose difficulty closest matches the student's current estimated ability.
3. **Security (Answer Protection)**: When serving questions to the browser/client, the API strips all `correct_option` and `explanation` metadata. The student receives only the question prompt and option choices (`A`, `B`, `C`, `D`).
4. **Answer Submission & Ability Update**:
   - The student submits their selected option to `POST /api/quiz/session/{id}/submit`.
   - The backend validates the response against the database's `correct_option`.
   - **If correct**: Student score increases, and estimated ability level increases (e.g., `+0.5`), presenting harder questions next.
   - **If incorrect**: Estimated ability level decreases (e.g., `-0.5`), presenting easier questions next to help reinforce concepts.
5. **Completion & Review**: Once the session reaches the target number of questions, it marks the session as `completed` and provides full performance feedback and detailed question reviews.

## Security Rule
- **Correct answers are NEVER sent to the client browser prior to student submission.** The `QuestionOut` client model strictly excludes answer keys and explanations until an answer has been submitted and recorded.

## Setup & Running

### Requirements
- Python 3.9+
- FastAPI & Uvicorn

### Local Development
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt

# Run Tests
pytest

# Start Server
uvicorn app.main:app --reload --port 8000
```
