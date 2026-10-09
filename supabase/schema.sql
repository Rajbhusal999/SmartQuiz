-- ==========================================
-- SmartQuiz Supabase SQL Schema & Seed Data
-- ==========================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(50) PRIMARY KEY,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- e.g. {"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"}
    correct_option VARCHAR(10) NOT NULL, -- e.g. "A", "B", "C", or "D"
    difficulty FLOAT NOT NULL DEFAULT 1.0, -- Scale 1.0 (easy) to 5.0 (hard)
    explanation TEXT
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    current_ability FLOAT NOT NULL DEFAULT 1.0,
    total_questions INT NOT NULL DEFAULT 5,
    questions_answered INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
    current_question_id VARCHAR(50),
    asked_question_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_questions (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(50) REFERENCES questions(id) ON DELETE CASCADE,
    student_answer VARCHAR(10),
    is_correct BOOLEAN,
    difficulty_at_time FLOAT NOT NULL,
    order_index INT NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Row Level Security (RLS) Policies
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to subjects and questions (excluding correct_option via API model)
CREATE POLICY "Public read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);

-- Allow full access to sessions & questions for service role / authenticated clients
CREATE POLICY "Allow anon session select" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anon session insert" ON quiz_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon session update" ON quiz_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow anon session_questions select" ON session_questions FOR SELECT USING (true);
CREATE POLICY "Allow anon session_questions insert" ON session_questions FOR INSERT WITH CHECK (true);

-- 3. Seed Sample Subjects
INSERT INTO subjects (id, title, description) VALUES
('python', 'Python Programming', 'Core Python concepts, data structures, and advanced features'),
('math', 'Mathematics', 'Algebra, logic, and computational reasoning')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Sample Questions
INSERT INTO questions (id, subject_id, question_text, options, correct_option, difficulty, explanation) VALUES
('py_1', 'python', 'What keyword is used to define a function in Python?', '{"A": "func", "B": "def", "C": "function", "D": "lambda"}'::jsonb, 'B', 1.0, '''def'' is used to define functions in Python.'),
('py_2', 'python', 'Which data structure is immutable in Python?', '{"A": "List", "B": "Dictionary", "C": "Tuple", "D": "Set"}'::jsonb, 'C', 2.0, 'Tuples cannot be modified after creation.'),
('py_3', 'python', 'What is the time complexity of looking up a key in a Python dictionary average case?', '{"A": "O(1)", "B": "O(n)", "C": "O(log n)", "D": "O(n^2)"}'::jsonb, 'A', 3.0, 'Dictionary lookups take O(1) average time due to hashing.'),
('py_4', 'python', 'What does the @classmethod decorator do in Python?', '{"A": "Makes method static", "B": "Passes class as first argument (cls)", "C": "Makes method private", "D": "Executes method on instantiation"}'::jsonb, 'B', 4.0, '@classmethod receives the class object as its first positional parameter.'),
('py_5', 'python', 'What mechanism does CPython use for automatic memory management alongside reference counting?', '{"A": "Mark-and-Sweep Garbage Collector", "B": "Generational Cyclic Garbage Collector", "C": "Manual Malloc/Free", "D": "Stop-the-World GC"}'::jsonb, 'B', 5.0, 'CPython uses reference counting supplemented by a generational cyclic garbage collector.')
ON CONFLICT (id) DO NOTHING;
