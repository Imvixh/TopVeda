-- ==============================================================================
-- TopVeda Assessment Migration: Decimal Negative Marking & Precision Grading
-- Supports fractional marking (e.g. 0, 0.2, 0.25, 0.5, 0.75, 1, 1.25, etc.)
-- Converts integer marks to PostgreSQL NUMERIC(6,2) and percentage to NUMERIC(5,2)
-- ==============================================================================

-- 1. student_test_questions (Negative marks and question marks)
ALTER TABLE public.student_test_questions 
    ALTER COLUMN negative_marks TYPE NUMERIC(6,2) USING negative_marks::numeric(6,2),
    ALTER COLUMN negative_marks SET DEFAULT 0.00,
    ALTER COLUMN marks TYPE NUMERIC(6,2) USING marks::numeric(6,2),
    ALTER COLUMN marks SET DEFAULT 4.00;

-- 2. student_test_answers (Marks awarded per question)
ALTER TABLE public.student_test_answers 
    ALTER COLUMN marks_awarded TYPE NUMERIC(6,2) USING marks_awarded::numeric(6,2),
    ALTER COLUMN marks_awarded SET DEFAULT 0.00;

-- 3. student_test_attempts (Scores, max score, and percentage)
ALTER TABLE public.student_test_attempts 
    ALTER COLUMN score_obtained TYPE NUMERIC(6,2) USING score_obtained::numeric(6,2),
    ALTER COLUMN score_obtained SET DEFAULT 0.00,
    ALTER COLUMN max_score TYPE NUMERIC(6,2) USING max_score::numeric(6,2),
    ALTER COLUMN max_score SET DEFAULT 0.00,
    ALTER COLUMN percentage TYPE NUMERIC(5,2) USING percentage::numeric(5,2),
    ALTER COLUMN percentage SET DEFAULT 0.00;

-- 4. student_tests (Total marks and passing marks)
ALTER TABLE public.student_tests 
    ALTER COLUMN total_marks TYPE NUMERIC(6,2) USING total_marks::numeric(6,2),
    ALTER COLUMN total_marks SET DEFAULT 100.00,
    ALTER COLUMN passing_marks TYPE NUMERIC(6,2) USING passing_marks::numeric(6,2),
    ALTER COLUMN passing_marks SET DEFAULT 40.00;
