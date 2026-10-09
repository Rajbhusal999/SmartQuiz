-- ====================================================================
-- Smart Quiz System - Comprehensive Supabase SQL Schema & Seed Data
-- ====================================================================

-- 1. Profiles Table (Tied to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'student', -- 'student', 'instructor', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically sync auth.users inserts into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        COALESCE(new.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = EXCLUDED.full_name;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Topics Table
CREATE TABLE IF NOT EXISTS topics (
    id VARCHAR(50) PRIMARY KEY,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(50) PRIMARY KEY,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    topic_id VARCHAR(50) REFERENCES topics(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- {"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"}
    correct_option VARCHAR(10) NOT NULL, -- e.g. "A", "B", "C", "D"
    difficulty FLOAT NOT NULL DEFAULT 1.0, -- Scale 1.0 (easy) to 5.0 (hard)
    explanation TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'generated'
    reviewed BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Quiz Sessions Table
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

-- 6. Session Questions / Response History Table
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

-- 7. Exams Table (Exam Assembler)
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    target_difficulty FLOAT NOT NULL DEFAULT 3.0,
    total_marks INT NOT NULL DEFAULT 100,
    questions_json JSONB NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Security & Row Level Security (RLS) Policies
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile or admins view all" ON profiles
    FOR SELECT USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Subjects & Topics RLS
CREATE POLICY "Public read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public read topics" ON topics FOR SELECT USING (true);

-- SECURITY RULE: Students MUST NOT be able to read the questions table directly.
-- Instructors & Admins can select questions. Backend Service-Role bypasses RLS for evaluation.
CREATE POLICY "Instructors and Admins manage questions" ON questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('instructor', 'admin')
        )
    );

-- Quiz Sessions RLS
CREATE POLICY "Users access own quiz sessions" ON quiz_sessions
    FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users access own session questions" ON session_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quiz_sessions 
            WHERE quiz_sessions.id = session_questions.session_id 
            AND (quiz_sessions.user_id = auth.uid()::text OR auth.role() = 'service_role')
        )
    );

-- Exams RLS
CREATE POLICY "Instructors and Admins manage exams" ON exams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('instructor', 'admin')
        )
    );

-- Audit Logs RLS
CREATE POLICY "Admins view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- ====================================================================
-- Initial Seed Data
-- ====================================================================

INSERT INTO subjects (id, title, description) VALUES
('python', 'Python Programming', 'Core Python concepts, data structures, and OOP'),
('math', 'Mathematics', 'Algebra, probability, and discrete computational logic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO topics (id, subject_id, name, description) VALUES
('py_basics', 'python', 'Basics & Syntax', 'Variables, control flow, functions'),
('py_data', 'python', 'Data Structures', 'Lists, tuples, dictionaries, sets'),
('py_advanced', 'python', 'Advanced Concepts', 'OOP, decorators, memory management'),
('math_algebra', 'math', 'Algebra', 'Linear equations and expressions')
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, subject_id, topic_id, question_text, options, correct_option, difficulty, explanation, source, reviewed) VALUES
('py_1', 'python', 'py_basics', 'What keyword is used to define a function in Python?', '{"A": "func", "B": "def", "C": "function", "D": "lambda"}'::jsonb, 'B', 1.0, '''def'' defines functions in Python.', 'manual', true),
('py_2', 'python', 'py_data', 'Which data structure is immutable in Python?', '{"A": "List", "B": "Dictionary", "C": "Tuple", "D": "Set"}'::jsonb, 'C', 2.0, 'Tuples cannot be mutated after instantiation.', 'manual', true),
('py_3', 'python', 'py_data', 'What is the average lookup time complexity for keys in a Python dictionary?', '{"A": "O(1)", "B": "O(n)", "C": "O(log n)", "D": "O(n^2)"}'::jsonb, 'A', 3.0, 'Dictionary lookups take average O(1) time complexity.', 'manual', true),
('py_4', 'python', 'py_advanced', 'What does the @classmethod decorator do in Python?', '{"A": "Makes method static", "B": "Passes class as first argument (cls)", "C": "Makes method private", "D": "Executes on import"}'::jsonb, 'B', 4.0, '@classmethod receives cls as first positional argument.', 'manual', true),
('py_5', 'python', 'py_advanced', 'Which mechanism manages circular references in CPython alongside reference counting?', '{"A": "Mark-and-Sweep", "B": "Generational Cyclic Garbage Collector", "C": "Manual Malloc/Free", "D": "Stop-the-World GC"}'::jsonb, 'B', 5.0, 'CPython uses a generational cyclic garbage collector for cycles.', 'manual', true)
ON CONFLICT (id) DO NOTHING;
