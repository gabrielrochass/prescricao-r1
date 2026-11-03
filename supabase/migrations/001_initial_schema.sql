-- Prescrição R1 — Initial Schema
-- Medical residency study tracker

-- ============================================================
-- 1. SUBJECTS (hierarchical specialties/topics)
-- ============================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subjects_parent ON subjects(parent_id);

-- ============================================================
-- 2. TARGET_EXAMS (exam boards)
-- ============================================================
CREATE TABLE target_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('primary', 'secondary')) DEFAULT 'primary',
  registration_start DATE,
  registration_end DATE,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'registered', 'done')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. SCHEDULE_BLOCKS (weekly base schedule)
-- ============================================================
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  block_type TEXT NOT NULL CHECK (block_type IN ('study', 'review', 'simulado', 'rest')),
  start_time TIME,
  duration_minutes INT,
  order_index INT DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE INDEX idx_schedule_blocks_weekday ON schedule_blocks(weekday);

-- ============================================================
-- 4. STUDY_ENTRIES (daily study log — main user input)
-- ============================================================
CREATE TABLE study_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  study_type TEXT NOT NULL CHECK (study_type IN ('questions', 'theory', 'flashcards', 'simulado')),
  total_questions INT,
  correct_questions INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_entries_date ON study_entries(date);
CREATE INDEX idx_study_entries_subject ON study_entries(subject_id);
CREATE INDEX idx_study_entries_date_subject ON study_entries(date, subject_id);

-- ============================================================
-- 5. REVIEW_QUEUE (algorithm-generated reviews)
-- ============================================================
CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  origin_entry_id UUID REFERENCES study_entries(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'rescheduled', 'skipped')) DEFAULT 'pending',
  priority INT DEFAULT 0,
  last_accuracy NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_queue_date ON review_queue(scheduled_date);
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_date_status ON review_queue(scheduled_date, status);

-- ============================================================
-- 6. SUBJECT_MASTERY (SRS state per subject)
-- ============================================================
CREATE TABLE subject_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
  current_accuracy NUMERIC DEFAULT 0,
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')) DEFAULT 'stable',
  stability NUMERIC DEFAULT 1.0,
  difficulty NUMERIC DEFAULT 5.0,
  interval_days INT DEFAULT 1,
  next_review_date DATE,
  total_questions INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subject_mastery_next_review ON subject_mastery(next_review_date);

-- ============================================================
-- 7. PROGRESSION_CONFIG (single row — study progression)
-- ============================================================
CREATE TABLE progression_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_date DATE NOT NULL,
  initial_daily_questions INT DEFAULT 15,
  target_daily_questions INT DEFAULT 100,
  weekly_increment_pct NUMERIC DEFAULT 12,
  min_accuracy_to_progress NUMERIC DEFAULT 65,
  current_phase TEXT CHECK (current_phase IN ('adaptation', 'base', 'consolidation', 'intensification', 'final')) DEFAULT 'adaptation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. WEEKLY_TARGETS (algorithm-generated weekly goals)
-- ============================================================
CREATE TABLE weekly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  week_start_date DATE NOT NULL,
  phase TEXT NOT NULL,
  target_questions INT NOT NULL,
  actual_questions INT DEFAULT 0,
  target_accuracy NUMERIC,
  actual_accuracy NUMERIC,
  adjusted BOOLEAN DEFAULT false,
  adjustment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_weekly_targets_week ON weekly_targets(week_number);
CREATE INDEX idx_weekly_targets_date ON weekly_targets(week_start_date);

-- ============================================================
-- 9. DAILY_PLAN (daily distribution within week)
-- ============================================================
CREATE TABLE daily_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_target_id UUID NOT NULL REFERENCES weekly_targets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question_count INT NOT NULL DEFAULT 0,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('study', 'review', 'simulado')),
  completed BOOLEAN DEFAULT false,
  actual_questions INT
);

CREATE INDEX idx_daily_plan_date ON daily_plan(date);

-- ============================================================
-- 10. MOCK_EXAMS (planned and completed mock exams)
-- ============================================================
CREATE TABLE mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_exam_id UUID REFERENCES target_exams(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('general', 'past_exam', 'thematic')),
  source TEXT,
  total_questions INT,
  correct_questions INT,
  duration_minutes INT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'done', 'skipped')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mock_exams_date ON mock_exams(scheduled_date);
CREATE INDEX idx_mock_exams_status ON mock_exams(status);

-- ============================================================
-- 11. MOCK_EXAM_BREAKDOWN (per-subject analysis)
-- ============================================================
CREATE TABLE mock_exam_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_questions INT NOT NULL DEFAULT 0,
  correct_questions INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_mock_breakdown_exam ON mock_exam_breakdown(mock_exam_id);

-- ============================================================
-- 12. USER_SETTINGS (single row — preferences)
-- ============================================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT DEFAULT 'Estudante',
  daily_question_limit INT DEFAULT 250,
  reset_hour INT DEFAULT 4,
  week_start_day INT DEFAULT 1,
  notification_enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '08:00',
  motivation_tone BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. STUDY_SCHEDULE (flexible time blocks — drag/drop)
-- ============================================================
CREATE TABLE study_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  title TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('study', 'review', 'simulado', 'rest', 'free')),
  color TEXT,
  active BOOLEAN DEFAULT true
);

CREATE INDEX idx_study_schedule_weekday ON study_schedule(weekday);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default user settings
INSERT INTO user_settings (user_name) VALUES ('Estudante');

-- Default progression config
INSERT INTO progression_config (start_date, exam_date, initial_daily_questions, target_daily_questions)
VALUES (CURRENT_DATE, '2027-09-01', 15, 100);

-- Target exams
INSERT INTO target_exams (name, exam_date, priority, status) VALUES
  ('SES-PE 2027', '2027-12-20', 'primary', 'upcoming'),
  ('ENAMED 2027.1', '2027-04-15', 'primary', 'upcoming'),
  ('ENAMED 2027.2', '2027-09-15', 'secondary', 'upcoming');

-- ============================================================
-- SUBJECTS SEED — Medical Residency Hierarchy
-- ============================================================

-- Level 1: Main specialties
INSERT INTO subjects (id, name, color, order_index) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Clínica Médica', '#6366f1', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Cirurgia', '#ef4444', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Pediatria', '#10b981', 3),
  ('a0000000-0000-0000-0000-000000000004', 'Ginecologia e Obstetrícia', '#ec4899', 4),
  ('a0000000-0000-0000-0000-000000000005', 'Medicina Preventiva', '#f59e0b', 5);

-- Level 2: Clínica Médica sub-areas
INSERT INTO subjects (id, name, parent_id, color, order_index) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Cardiologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 1),
  ('b0000000-0000-0000-0000-000000000002', 'Pneumologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 2),
  ('b0000000-0000-0000-0000-000000000003', 'Gastroenterologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 3),
  ('b0000000-0000-0000-0000-000000000004', 'Nefrologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 4),
  ('b0000000-0000-0000-0000-000000000005', 'Endocrinologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 5),
  ('b0000000-0000-0000-0000-000000000006', 'Infectologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 6),
  ('b0000000-0000-0000-0000-000000000007', 'Reumatologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 7),
  ('b0000000-0000-0000-0000-000000000008', 'Hematologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 8),
  ('b0000000-0000-0000-0000-000000000009', 'Neurologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 9),
  ('b0000000-0000-0000-0000-000000000010', 'Dermatologia', 'a0000000-0000-0000-0000-000000000001', '#6366f1', 10);

-- Level 3: Cardiologia topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Insuficiência Cardíaca', 'b0000000-0000-0000-0000-000000000001', '#6366f1', 1),
  ('Hipertensão Arterial', 'b0000000-0000-0000-0000-000000000001', '#6366f1', 2),
  ('Síndromes Coronarianas', 'b0000000-0000-0000-0000-000000000001', '#6366f1', 3),
  ('Arritmias', 'b0000000-0000-0000-0000-000000000001', '#6366f1', 4),
  ('Valvopatias', 'b0000000-0000-0000-0000-000000000001', '#6366f1', 5);

-- Level 3: Pneumologia topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Asma', 'b0000000-0000-0000-0000-000000000002', '#6366f1', 1),
  ('DPOC', 'b0000000-0000-0000-0000-000000000002', '#6366f1', 2),
  ('Pneumonia', 'b0000000-0000-0000-0000-000000000002', '#6366f1', 3),
  ('Tuberculose', 'b0000000-0000-0000-0000-000000000002', '#6366f1', 4),
  ('Tromboembolismo Pulmonar', 'b0000000-0000-0000-0000-000000000002', '#6366f1', 5);

-- Level 3: Gastroenterologia topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Doença do Refluxo', 'b0000000-0000-0000-0000-000000000003', '#6366f1', 1),
  ('Hepatites', 'b0000000-0000-0000-0000-000000000003', '#6366f1', 2),
  ('Cirrose', 'b0000000-0000-0000-0000-000000000003', '#6366f1', 3),
  ('Doença Inflamatória Intestinal', 'b0000000-0000-0000-0000-000000000003', '#6366f1', 4),
  ('Pancreatite', 'b0000000-0000-0000-0000-000000000003', '#6366f1', 5);

-- Level 3: Nefrologia topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Insuficiência Renal Aguda', 'b0000000-0000-0000-0000-000000000004', '#6366f1', 1),
  ('Doença Renal Crônica', 'b0000000-0000-0000-0000-000000000004', '#6366f1', 2),
  ('Distúrbios Hidroeletrolíticos', 'b0000000-0000-0000-0000-000000000004', '#6366f1', 3),
  ('Glomerulopatias', 'b0000000-0000-0000-0000-000000000004', '#6366f1', 4),
  ('Infecção do Trato Urinário', 'b0000000-0000-0000-0000-000000000004', '#6366f1', 5);

-- Level 2: Cirurgia sub-areas
INSERT INTO subjects (id, name, parent_id, color, order_index) VALUES
  ('b0000000-0000-0000-0000-000000000011', 'Cirurgia Geral', 'a0000000-0000-0000-0000-000000000002', '#ef4444', 1),
  ('b0000000-0000-0000-0000-000000000012', 'Trauma', 'a0000000-0000-0000-0000-000000000002', '#ef4444', 2),
  ('b0000000-0000-0000-0000-000000000013', 'Cirurgia Vascular', 'a0000000-0000-0000-0000-000000000002', '#ef4444', 3),
  ('b0000000-0000-0000-0000-000000000014', 'Ortopedia', 'a0000000-0000-0000-0000-000000000002', '#ef4444', 4),
  ('b0000000-0000-0000-0000-000000000015', 'Urologia', 'a0000000-0000-0000-0000-000000000002', '#ef4444', 5);

-- Level 3: Cirurgia Geral topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Abdome Agudo', 'b0000000-0000-0000-0000-000000000011', '#ef4444', 1),
  ('Hérnias', 'b0000000-0000-0000-0000-000000000011', '#ef4444', 2),
  ('Vias Biliares', 'b0000000-0000-0000-0000-000000000011', '#ef4444', 3),
  ('Pré e Pós-operatório', 'b0000000-0000-0000-0000-000000000011', '#ef4444', 4);

-- Level 3: Trauma topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('ATLS', 'b0000000-0000-0000-0000-000000000012', '#ef4444', 1),
  ('Trauma Torácico', 'b0000000-0000-0000-0000-000000000012', '#ef4444', 2),
  ('Trauma Abdominal', 'b0000000-0000-0000-0000-000000000012', '#ef4444', 3),
  ('TCE', 'b0000000-0000-0000-0000-000000000012', '#ef4444', 4);

-- Level 2: Pediatria sub-areas
INSERT INTO subjects (id, name, parent_id, color, order_index) VALUES
  ('b0000000-0000-0000-0000-000000000016', 'Neonatologia', 'a0000000-0000-0000-0000-000000000003', '#10b981', 1),
  ('b0000000-0000-0000-0000-000000000017', 'Puericultura', 'a0000000-0000-0000-0000-000000000003', '#10b981', 2),
  ('b0000000-0000-0000-0000-000000000018', 'Infectologia Pediátrica', 'a0000000-0000-0000-0000-000000000003', '#10b981', 3),
  ('b0000000-0000-0000-0000-000000000019', 'Urgências Pediátricas', 'a0000000-0000-0000-0000-000000000003', '#10b981', 4);

-- Level 2: GO sub-areas
INSERT INTO subjects (id, name, parent_id, color, order_index) VALUES
  ('b0000000-0000-0000-0000-000000000020', 'Obstetrícia', 'a0000000-0000-0000-0000-000000000004', '#ec4899', 1),
  ('b0000000-0000-0000-0000-000000000021', 'Ginecologia', 'a0000000-0000-0000-0000-000000000004', '#ec4899', 2);

-- Level 3: Obstetrícia topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Pré-natal', 'b0000000-0000-0000-0000-000000000020', '#ec4899', 1),
  ('Síndromes Hipertensivas', 'b0000000-0000-0000-0000-000000000020', '#ec4899', 2),
  ('Hemorragias', 'b0000000-0000-0000-0000-000000000020', '#ec4899', 3),
  ('Parto', 'b0000000-0000-0000-0000-000000000020', '#ec4899', 4);

-- Level 3: Ginecologia topics
INSERT INTO subjects (name, parent_id, color, order_index) VALUES
  ('Ciclo Menstrual', 'b0000000-0000-0000-0000-000000000021', '#ec4899', 1),
  ('Câncer de Colo', 'b0000000-0000-0000-0000-000000000021', '#ec4899', 2),
  ('Câncer de Mama', 'b0000000-0000-0000-0000-000000000021', '#ec4899', 3),
  ('Sangramento Uterino Anormal', 'b0000000-0000-0000-0000-000000000021', '#ec4899', 4);

-- Level 2: Medicina Preventiva sub-areas
INSERT INTO subjects (id, name, parent_id, color, order_index) VALUES
  ('b0000000-0000-0000-0000-000000000022', 'Epidemiologia', 'a0000000-0000-0000-0000-000000000005', '#f59e0b', 1),
  ('b0000000-0000-0000-0000-000000000023', 'Bioestatística', 'a0000000-0000-0000-0000-000000000005', '#f59e0b', 2),
  ('b0000000-0000-0000-0000-000000000024', 'SUS e Políticas de Saúde', 'a0000000-0000-0000-0000-000000000005', '#f59e0b', 3),
  ('b0000000-0000-0000-0000-000000000025', 'Vigilância em Saúde', 'a0000000-0000-0000-0000-000000000005', '#f59e0b', 4),
  ('b0000000-0000-0000-0000-000000000026', 'Ética Médica', 'a0000000-0000-0000-0000-000000000005', '#f59e0b', 5);
