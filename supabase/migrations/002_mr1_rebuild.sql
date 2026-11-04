-- MR1 Rebuild: Drop old schema, create 9 entities per PRD
-- Migration 002 — 04/11/2026

-- ============================================================
-- DROP ALL OLD TABLES
-- ============================================================
DROP TABLE IF EXISTS mock_exam_breakdown CASCADE;
DROP TABLE IF EXISTS mock_exams CASCADE;
DROP TABLE IF EXISTS daily_plan CASCADE;
DROP TABLE IF EXISTS weekly_targets CASCADE;
DROP TABLE IF EXISTS weekly_plan_topics CASCADE;
DROP TABLE IF EXISTS weekly_plan CASCADE;
DROP TABLE IF EXISTS subject_mastery CASCADE;
DROP TABLE IF EXISTS review_queue CASCADE;
DROP TABLE IF EXISTS study_entries CASCADE;
DROP TABLE IF EXISTS schedule_blocks CASCADE;
DROP TABLE IF EXISTS study_schedule CASCADE;
DROP TABLE IF EXISTS progression_config CASCADE;
DROP TABLE IF EXISTS target_exams CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- ============================================================
-- 1. USERS (profile table, linked to Supabase Auth)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'Estudante',
  specialty TEXT DEFAULT 'Ginecologia e Obstetrícia',
  daily_limit_initial INT DEFAULT 30,
  daily_limit_current INT DEFAULT 30,
  notification_morning TIME DEFAULT '07:00',
  notification_evening TIME DEFAULT '20:00',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. EXAMS
-- ============================================================
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  estimated BOOLEAN DEFAULT true,
  reference_cutoff NUMERIC,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exams_user ON exams(user_id);

-- ============================================================
-- 3. ROTATIONS
-- ============================================================
CREATE TABLE rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  weekday_hours NUMERIC DEFAULT 2,
  weekend_hours NUMERIC DEFAULT 4,
  shifts_per_week INT DEFAULT 0,
  new_topic_days INT[] DEFAULT '{1,3,5}',
  is_active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rotations_user ON rotations(user_id);

-- ============================================================
-- 4. GRADE_LESSONS (reference data, 112 lessons from EMR)
-- ============================================================
CREATE TABLE grade_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emr_order INT NOT NULL,
  name TEXT NOT NULL,
  big_area TEXT NOT NULL CHECK (big_area IN ('Clínica Médica', 'Cirurgia', 'Pediatria', 'Ginecologia e Obstetrícia', 'Medicina Preventiva')),
  category TEXT NOT NULL CHECK (category IN ('essential', 'important', 'complementary')),
  relevance NUMERIC DEFAULT 0,
  sort_order INT NOT NULL,
  mandatory_duration_min INT DEFAULT 0,
  emr_plus_duration_min INT DEFAULT 0,
  summary_duration_min INT DEFAULT 0,
  linked_updates TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_grade_lessons_category ON grade_lessons(category);
CREATE INDEX idx_grade_lessons_area ON grade_lessons(big_area);
CREATE INDEX idx_grade_lessons_order ON grade_lessons(sort_order);

-- ============================================================
-- 5. SUBJECTS (user's study instances of grade_lessons)
-- ============================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_lesson_id UUID NOT NULL REFERENCES grade_lessons(id) ON DELETE CASCADE,
  incidence TEXT NOT NULL CHECK (incidence IN ('high', 'medium', 'low')),
  incidence_auto BOOLEAN DEFAULT true,
  effort INT CHECK (effort BETWEEN 1 AND 5),
  study_date DATE,
  real_time_spent_min INT,
  valve_used BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subjects_user ON subjects(user_id);
CREATE INDEX idx_subjects_lesson ON subjects(grade_lesson_id);

-- ============================================================
-- 6. SIMULADOS
-- ============================================================
CREATE TABLE simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_date DATE NOT NULL,
  done_date DATE,
  type TEXT NOT NULL CHECK (type IN ('regular', 'final_stretch')) DEFAULT 'regular',
  corrected_date DATE,
  status TEXT NOT NULL CHECK (status IN ('planned', 'done', 'late')) DEFAULT 'planned',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_simulados_user ON simulados(user_id);
CREATE INDEX idx_simulados_date ON simulados(planned_date);

-- ============================================================
-- 7. AGENDA_ITEMS
-- ============================================================
CREATE TABLE agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('study', 'fixation', 'review', 'simulado', 'guaranteed_review')),
  review_number INT,
  planned_date DATE NOT NULL,
  done_date DATE,
  status TEXT NOT NULL CHECK (status IN ('planned', 'done', 'late')) DEFAULT 'planned',
  planned_questions INT,
  done_questions INT,
  correct_questions INT,
  interval_used INT,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  simulado_id UUID REFERENCES simulados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT agenda_item_has_subject_or_simulado CHECK (
    (subject_id IS NOT NULL AND simulado_id IS NULL) OR
    (subject_id IS NULL AND simulado_id IS NOT NULL)
  )
);

CREATE INDEX idx_agenda_user_date ON agenda_items(user_id, planned_date);
CREATE INDEX idx_agenda_status ON agenda_items(status);
CREATE INDEX idx_agenda_subject ON agenda_items(subject_id);
CREATE INDEX idx_agenda_type ON agenda_items(type);

-- ============================================================
-- 8. AREA_RESULTS (simulado results per big area, out of 20)
-- ============================================================
CREATE TABLE area_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  big_area TEXT NOT NULL CHECK (big_area IN ('Clínica Médica', 'Cirurgia', 'Pediatria', 'Ginecologia e Obstetrícia', 'Medicina Preventiva')),
  errors INT NOT NULL DEFAULT 0,
  correct INT NOT NULL DEFAULT 0,
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE
);

CREATE INDEX idx_area_results_simulado ON area_results(simulado_id);

-- ============================================================
-- 9. WEEK_ADJUSTMENTS
-- ============================================================
CREATE TABLE week_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  available_hours NUMERIC,
  twelve_hour_warning_accepted BOOLEAN DEFAULT false,
  rotation_id UUID REFERENCES rotations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_week_adj_user ON week_adjustments(user_id);

-- ============================================================
-- DISABLE RLS (single user v1, will enable for multi-user)
-- ============================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE grade_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulados DISABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE area_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE week_adjustments DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED: Default user
-- ============================================================
INSERT INTO users (id, email, display_name, specialty)
VALUES ('00000000-0000-0000-0000-000000000001', 'estudante@mr1.app', 'Estudante', 'Ginecologia e Obstetrícia');

-- ============================================================
-- SEED: Target exams
-- ============================================================
INSERT INTO exams (name, exam_date, estimated, reference_cutoff, user_id) VALUES
  ('ENAMED 2027', '2027-09-13', true, NULL, '00000000-0000-0000-0000-000000000001'),
  ('SES-PE 2028', '2027-12-19', true, 64.3, '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- SEED: 112 Grade Lessons from EMR Extensivo 2025 R1 Bônus
-- ============================================================

-- ESSENCIAIS (24 lessons, high incidence)
INSERT INTO grade_lessons (emr_order, name, big_area, category, relevance, sort_order, mandatory_duration_min, emr_plus_duration_min, summary_duration_min, linked_updates) VALUES
(1, 'Perioperatório e Remit', 'Cirurgia', 'essential', 13.6, 1, 75, 20, 5, NULL),
(2, 'Abdome Agudo 1 e 2', 'Cirurgia', 'essential', 13.6, 2, 94, 11, 5, NULL),
(3, 'Doenças das Vias Biliares', 'Cirurgia', 'essential', 13.4, 3, 68, 14, 5, NULL),
(4, 'Infecções Sexualmente Transmissíveis 1 e 2', 'Ginecologia e Obstetrícia', 'essential', 9.2, 4, 138, 15, 5, NULL),
(5, 'Imunizações', 'Pediatria', 'essential', 8.4, 5, 96, 8, 5, '{"Atualizações 2025 - Pediatria","Nota Técnica nº49/2025"}'),
(6, 'Hérnias e Obstrução Intestinal', 'Cirurgia', 'essential', 8.2, 6, 55, 8, 5, NULL),
(7, 'SUS Parte 1 e 2', 'Medicina Preventiva', 'essential', 7.8, 7, 139, 14, 5, NULL),
(8, 'Doenças do Esôfago e Estômago', 'Cirurgia', 'essential', 7.8, 8, 114, 21, 5, NULL),
(9, 'Diabetes Parte 1 e 2', 'Clínica Médica', 'essential', 7.6, 9, 172, 25, 5, NULL),
(10, 'Tuberculose', 'Clínica Médica', 'essential', 7.2, 10, 66, 19, 5, NULL),
(11, 'Doenças Osteometabólicas e das Paratireoides', 'Clínica Médica', 'essential', 7.0, 11, 104, 11, 5, NULL),
(12, 'Arboviroses', 'Clínica Médica', 'essential', 6.2, 12, 69, 7, 5, NULL),
(13, 'Prematuridade e Amniorrexe', 'Ginecologia e Obstetrícia', 'essential', 6.2, 13, 93, 21, 5, NULL),
(14, 'Subespecialidades Pediátricas 1 e 2', 'Pediatria', 'essential', 6.2, 14, 159, 17, 5, NULL),
(15, 'Transtornos do Espectro Autista e TDAH', 'Pediatria', 'essential', 5.8, 15, 52, 7, 5, NULL),
(16, 'Síndromes Hipertensivas na Gestação', 'Ginecologia e Obstetrícia', 'essential', 5.8, 16, 66, 33, 5, NULL),
(17, 'Doenças da Tireoide', 'Clínica Médica', 'essential', 5.6, 17, 90, 12, 5, NULL),
(18, 'Artrites', 'Clínica Médica', 'essential', 5.4, 18, 100, 13, 5, NULL),
(19, 'Pré-Natal', 'Ginecologia e Obstetrícia', 'essential', 5.4, 19, 94, 19, 5, NULL),
(20, 'Hipertensão Portal', 'Cirurgia', 'essential', 5.4, 20, 40, 7, 5, NULL),
(21, 'Colagenoses', 'Clínica Médica', 'essential', 5.4, 21, 74, 5, 5, NULL),
(22, 'Proctologia', 'Cirurgia', 'essential', 5.2, 22, 46, 12, 5, NULL),
(23, 'Hepatoesplenomegalia Febril', 'Clínica Médica', 'essential', 5.2, 23, 83, 18, 5, NULL),
(24, 'Pneumonias e Derrame Pleural', 'Clínica Médica', 'essential', 5.0, 24, 82, 24, 5, NULL);

-- IMPORTANTES (27 lessons, medium incidence)
INSERT INTO grade_lessons (emr_order, name, big_area, category, relevance, sort_order, mandatory_duration_min, emr_plus_duration_min, summary_duration_min, linked_updates) VALUES
(1, 'Anemias Hiperproliferativas e Hipoproliferativas', 'Clínica Médica', 'important', 4.8, 25, 159, 36, 5, NULL),
(2, 'Miscelânea (Bioética, Morte Encefálica e Declaração de Óbito)', 'Medicina Preventiva', 'important', 4.8, 26, 75, 5, 5, NULL),
(3, 'Epidemiologia', 'Medicina Preventiva', 'important', 4.8, 27, 119, 11, 5, NULL),
(4, 'Hipertensão Arterial Sistêmica', 'Clínica Médica', 'important', 4.6, 28, 93, 16, 5, '{"Atualização HAS - Novas DBHA"}'),
(5, 'Distúrbios Hidroeletrolíticos', 'Clínica Médica', 'important', 4.6, 29, 114, 27, 5, NULL),
(6, 'Atenção Primária a Saúde e Estratégia de Saúde da Família', 'Medicina Preventiva', 'important', 4.4, 30, 224, 22, 5, NULL),
(7, 'Neoplasias Intestinais 1 e 2', 'Cirurgia', 'important', 4.2, 31, 140, 20, 5, NULL),
(8, 'Estudos Epidemiológicos 1 e 2', 'Medicina Preventiva', 'important', 4.2, 32, 150, 20, 5, NULL),
(9, 'Neoplasias Ginecológicas e Lesões Precursoras 1 e 2', 'Ginecologia e Obstetrícia', 'important', 4.2, 33, 188, 37, 5, NULL),
(10, 'IVAS, IVAI e Covid', 'Pediatria', 'important', 4.2, 34, 197, 39, 5, NULL),
(11, 'Insuficiência Renal Aguda', 'Clínica Médica', 'important', 4.2, 35, 66, 23, 5, NULL),
(12, 'Intoxicações Exógenas e Acidentes com Animais Peçonhentos', 'Clínica Médica', 'important', 4.2, 36, 93, 13, 5, NULL),
(13, 'Diarreia e Desidratação em Pediatria', 'Pediatria', 'important', 4.2, 37, 106, 32, 5, NULL),
(14, 'Dislipidemia, DAC e SCA', 'Clínica Médica', 'important', 4.0, 38, 120, 19, 5, NULL),
(15, 'Síndromes Febris', 'Clínica Médica', 'important', 4.0, 39, 59, 14, 5, NULL),
(16, 'Terapia Intensiva 1 e 2', 'Clínica Médica', 'important', 4.0, 40, 119, 20, 5, NULL),
(17, 'Diabetes na Gravidez', 'Ginecologia e Obstetrícia', 'important', 3.8, 41, 57, 29, 5, NULL),
(18, 'Sangramentos na 1ª e 2ª Metade da Gestação', 'Ginecologia e Obstetrícia', 'important', 3.6, 42, 128, 16, 5, NULL),
(19, 'Doença Pulmonar Obstrutiva Crônica', 'Clínica Médica', 'important', 3.6, 43, 47, 19, 5, NULL),
(20, 'Covid e Influenza', 'Clínica Médica', 'important', 3.6, 44, 76, 14, 5, NULL),
(21, 'Parasitoses', 'Clínica Médica', 'important', 3.6, 45, 54, 12, 5, NULL),
(22, 'Infecções do SNC e Neuropatias', 'Clínica Médica', 'important', 3.6, 46, 58, 25, 5, NULL),
(23, 'Infecção do Trato Urinário', 'Clínica Médica', 'important', 3.6, 47, 65, 27, 5, NULL),
(24, 'Incontinência Urinária e Distopias Genitais', 'Ginecologia e Obstetrícia', 'important', 3.6, 48, 96, 11, 5, NULL),
(25, 'Sangramento Uterino Anormal e Câncer de Endométrio', 'Ginecologia e Obstetrícia', 'important', 3.4, 49, 97, 9, 5, NULL),
(26, 'Cirrose Hepática e Suas Complicações', 'Clínica Médica', 'important', 3.2, 50, 82, 23, 5, NULL),
(27, 'Cirurgia Bariátrica', 'Cirurgia', 'important', 3.0, 51, 51, 14, 5, NULL);

-- COMPLEMENTARES (61 lessons, low incidence)
INSERT INTO grade_lessons (emr_order, name, big_area, category, relevance, sort_order, mandatory_duration_min, emr_plus_duration_min, summary_duration_min, linked_updates) VALUES
(1, 'Cuidados Paliativos', 'Clínica Médica', 'complementary', 3.0, 52, 65, 21, 5, NULL),
(2, 'Tromboembolismo Venoso', 'Clínica Médica', 'complementary', 3.0, 53, 86, 16, 5, NULL),
(3, 'Parto 1 e 2', 'Ginecologia e Obstetrícia', 'complementary', 3.0, 54, 189, 46, 5, NULL),
(4, 'Icterícia Neonatal', 'Pediatria', 'complementary', 3.0, 55, 71, 28, 5, NULL),
(5, 'Vasculites', 'Clínica Médica', 'complementary', 3.0, 56, 60, 5, 5, NULL),
(6, 'Glomerulopatias', 'Clínica Médica', 'complementary', 2.8, 57, 110, 28, 5, NULL),
(7, 'Insuficiência Cardíaca', 'Clínica Médica', 'complementary', 2.8, 58, 84, 24, 5, NULL),
(8, 'Dermatologia 1 e 2', 'Clínica Médica', 'complementary', 2.6, 59, 110, 3, 5, NULL),
(9, 'Depressão, Ansiedade e Abuso de Substâncias', 'Clínica Médica', 'complementary', 2.4, 60, 151, 12, 5, NULL),
(10, 'Reanimação Neonatal e PCR em Pediatria', 'Pediatria', 'complementary', 2.4, 61, 103, 15, 5, NULL),
(11, 'Sofrimento Fetal', 'Ginecologia e Obstetrícia', 'complementary', 2.4, 62, 109, 13, 5, NULL),
(12, 'Doenças Exantemáticas', 'Pediatria', 'complementary', 2.4, 63, 75, 7, 5, NULL),
(13, 'Síndrome dos Ovários Policísticos', 'Ginecologia e Obstetrícia', 'complementary', 2.4, 64, 40, 11, 5, NULL),
(14, 'Embriologia, Amenorreia e DDS', 'Ginecologia e Obstetrícia', 'complementary', 2.4, 65, 74, 7, 5, NULL),
(15, 'Vigilância em Saúde e Saúde do Trabalhador', 'Medicina Preventiva', 'complementary', 2.4, 66, 164, 8, 5, NULL),
(16, 'Cefaleias', 'Clínica Médica', 'complementary', 2.2, 67, 46, 16, 5, NULL),
(17, 'Síndromes Diarreicas', 'Cirurgia', 'complementary', 2.2, 68, 47, 11, 5, NULL),
(18, 'Distúrbios Acidobásicos', 'Clínica Médica', 'complementary', 2.2, 69, 85, 25, 5, NULL),
(19, 'Demências, Parkinsonismo e Delirium', 'Clínica Médica', 'complementary', 2.2, 70, 47, 17, 5, NULL),
(20, 'Princípios da Anestesia', 'Cirurgia', 'complementary', 2.0, 71, 91, 14, 5, NULL),
(21, 'HIV / Aids', 'Clínica Médica', 'complementary', 1.8, 72, 106, 40, 5, NULL),
(22, 'Asma', 'Pediatria', 'complementary', 1.8, 73, 57, 14, 5, '{"Asma - Atualização 2025"}'),
(23, 'Puerpério e Hemorragia Pós-Parto', 'Ginecologia e Obstetrícia', 'complementary', 1.8, 74, 77, 23, 5, NULL),
(24, 'Anticoncepção', 'Ginecologia e Obstetrícia', 'complementary', 1.8, 75, 58, 17, 5, NULL),
(25, 'Diagnóstico de Gravidez e Modificações do Organismo Materno', 'Ginecologia e Obstetrícia', 'complementary', 1.8, 76, 81, 26, 5, NULL),
(26, 'Ciclo Menstrual', 'Ginecologia e Obstetrícia', 'complementary', 1.8, 77, 60, 7, 5, NULL),
(27, 'Crescimento, Desenvolvimento e Puberdade', 'Pediatria', 'complementary', 1.8, 78, 125, 35, 5, NULL),
(28, 'Trauma 1 e 2', 'Cirurgia', 'complementary', 1.8, 79, 86, 11, 5, '{"ATLS - 2025"}'),
(29, 'Endocardite Infecciosa', 'Clínica Médica', 'complementary', 1.8, 80, 67, 21, 5, NULL),
(30, 'Ortopedia', 'Cirurgia', 'complementary', 1.6, 81, 103, 11, 5, NULL),
(31, 'Cirurgia Plástica', 'Cirurgia', 'complementary', 1.6, 82, 51, 12, 5, NULL),
(32, 'Rastreio de Doenças e MFC', 'Medicina Preventiva', 'complementary', 1.4, 83, 133, 9, 5, NULL),
(33, 'Dismenorreia e Síndrome Pré-Menstrual', 'Ginecologia e Obstetrícia', 'complementary', 1.2, 84, 23, 9, 5, NULL),
(34, 'Doença Renal Crônica', 'Clínica Médica', 'complementary', 1.2, 85, 75, 15, 5, NULL),
(35, 'Climatério', 'Ginecologia e Obstetrícia', 'complementary', 1.2, 86, 47, 15, 5, NULL),
(36, 'Gemelaridade e Doença Hemolítica Perinatal', 'Ginecologia e Obstetrícia', 'complementary', 1.2, 87, 67, 13, 5, NULL),
(37, 'Hemorragia Gastrointestinal', 'Cirurgia', 'complementary', 1.2, 88, 45, 9, 5, NULL),
(38, 'Alimentação na Infância e Desnutrição', 'Pediatria', 'complementary', 1.2, 89, 71, 16, 5, NULL),
(39, 'Avaliação do Recém-Nascido', 'Pediatria', 'complementary', 1.2, 90, 115, 12, 5, NULL),
(40, 'Prevenção de Acidentes', 'Pediatria', 'complementary', 1.2, 91, 55, 17, 5, NULL),
(41, 'Insuficiência Hepática Aguda e Hepatites Virais', 'Clínica Médica', 'complementary', 1.2, 92, 89, 26, 5, NULL),
(42, 'Sepse na Pediatria', 'Pediatria', 'complementary', 1.0, 93, 46, 23, 5, NULL),
(43, 'Urologia', 'Cirurgia', 'complementary', 1.0, 94, 58, 9, 5, NULL),
(44, 'AVC', 'Clínica Médica', 'complementary', 1.0, 95, 55, 15, 5, NULL),
(45, 'Valvopatias', 'Clínica Médica', 'complementary', 0.6, 96, 66, 21, 5, NULL),
(46, 'Reanimação Cardiopulmonar', 'Clínica Médica', 'complementary', 0.6, 97, 51, 28, 5, NULL),
(47, 'Sepse Neonatal e Infecções Congênitas', 'Pediatria', 'complementary', 0.6, 98, 107, 21, 5, NULL),
(48, 'Antibióticos', 'Clínica Médica', 'complementary', 0.6, 99, 78, 19, 5, NULL),
(49, 'Cirurgia Vascular', 'Cirurgia', 'complementary', 0.6, 100, 57, 9, 5, NULL),
(50, 'Displasias Hematológicas 1 e 2', 'Clínica Médica', 'complementary', 0.6, 101, 133, 22, 5, NULL),
(51, 'Febre Reumática', 'Pediatria', 'complementary', 0.6, 102, 50, 17, 5, NULL),
(52, 'Doenças da Hipófise, Suprarrenais e Obesidade', 'Clínica Médica', 'complementary', 0.6, 103, 93, 9, 5, NULL),
(53, 'Convulsão', 'Clínica Médica', 'complementary', 0.6, 104, 31, 9, 5, NULL),
(54, 'Endometriose', 'Ginecologia e Obstetrícia', 'complementary', 0.6, 105, 40, 9, 5, NULL),
(55, 'Cirurgia Cardíaca e Torácica', 'Cirurgia', 'complementary', 0.6, 106, 29, 6, 5, NULL),
(56, 'Arritmias', 'Clínica Médica', 'complementary', 0.4, 107, 93, 21, 5, '{"Atualização 2025 - Fibrilação Atrial"}'),
(57, 'Cirurgia de Cabeça e Pescoço', 'Cirurgia', 'complementary', 0.4, 108, 64, 8, 5, NULL),
(58, 'Geriatria', 'Clínica Médica', 'complementary', 0.4, 109, 59, 32, 5, NULL),
(59, 'Distúrbios da Hemostasia', 'Clínica Médica', 'complementary', 0.0, 110, 60, 7, 5, NULL),
(60, 'Febre Sem Sinais Localizatórios', 'Pediatria', 'complementary', 0.0, 111, 42, 30, 5, NULL),
(61, 'Infertilidade', 'Ginecologia e Obstetrícia', 'complementary', 0.0, 112, 37, 11, 5, NULL);
