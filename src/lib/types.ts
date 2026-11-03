export interface Subject {
  id: string
  name: string
  parent_id: string | null
  color: string
  icon: string | null
  order_index: number
  created_at: string
  children?: Subject[]
}

export interface TargetExam {
  id: string
  name: string
  exam_date: string
  priority: 'primary' | 'secondary'
  registration_start: string | null
  registration_end: string | null
  status: 'upcoming' | 'registered' | 'done'
  created_at: string
}

export interface ScheduleBlock {
  id: string
  subject_id: string | null
  weekday: number
  block_type: 'study' | 'review' | 'simulado' | 'rest'
  start_time: string | null
  duration_minutes: number | null
  order_index: number
  active: boolean
}

export interface StudyEntry {
  id: string
  subject_id: string
  date: string
  study_type: 'questions' | 'theory' | 'flashcards' | 'simulado'
  total_questions: number | null
  correct_questions: number | null
  notes: string | null
  created_at: string
  subject?: Subject
}

export interface ReviewQueueItem {
  id: string
  subject_id: string
  scheduled_date: string
  origin_entry_id: string | null
  status: 'pending' | 'done' | 'rescheduled' | 'skipped'
  priority: number
  last_accuracy: number | null
  created_at: string
  subject?: Subject
}

export interface SubjectMastery {
  id: string
  subject_id: string
  current_accuracy: number
  trend: 'improving' | 'stable' | 'declining'
  stability: number
  difficulty: number
  interval_days: number
  next_review_date: string | null
  total_questions: number
  total_correct: number
  updated_at: string
  subject?: Subject
}

export interface ProgressionConfig {
  id: string
  start_date: string
  exam_date: string
  initial_daily_questions: number
  target_daily_questions: number
  weekly_increment_pct: number
  min_accuracy_to_progress: number
  current_phase: Phase
  created_at: string
  updated_at: string
}

export type Phase = 'adaptation' | 'base' | 'consolidation' | 'intensification' | 'final'

export interface WeeklyTarget {
  id: string
  week_number: number
  week_start_date: string
  phase: string
  target_questions: number
  actual_questions: number
  target_accuracy: number | null
  actual_accuracy: number | null
  adjusted: boolean
  adjustment_reason: string | null
  created_at: string
}

export interface DailyPlan {
  id: string
  weekly_target_id: string
  date: string
  subject_id: string
  question_count: number
  plan_type: 'study' | 'review' | 'simulado'
  completed: boolean
  actual_questions: number | null
  subject?: Subject
}

export interface MockExam {
  id: string
  target_exam_id: string | null
  scheduled_date: string
  scheduled_time: string | null
  exam_type: 'general' | 'past_exam' | 'thematic'
  source: string | null
  total_questions: number | null
  correct_questions: number | null
  duration_minutes: number | null
  status: 'scheduled' | 'done' | 'skipped'
  notes: string | null
  created_at: string
  target_exam?: TargetExam
}

export interface MockExamBreakdown {
  id: string
  mock_exam_id: string
  subject_id: string
  total_questions: number
  correct_questions: number
  subject?: Subject
}

export interface UserSettings {
  id: string
  user_name: string
  daily_question_limit: number
  reset_hour: number
  week_start_day: number
  notification_enabled: boolean
  notification_time: string
  motivation_tone: boolean
  theme: string
  created_at: string
  updated_at: string
}

export interface StudySchedule {
  id: string
  weekday: number
  title: string
  start_time: string
  end_time: string
  subject_id: string | null
  schedule_type: 'study' | 'review' | 'simulado' | 'rest' | 'free'
  color: string | null
  active: boolean
}

export interface WeeklyPlan {
  id: string
  week_start_date: string
  week_label: string | null
  notes: string | null
  created_at: string
  updated_at: string
  topics?: WeeklyPlanTopic[]
}

export interface WeeklyPlanTopic {
  id: string
  weekly_plan_id: string
  subject_id: string
  goal: string | null
  question_target: number | null
  status: 'pending' | 'in_progress' | 'done'
  order_index: number
  subject?: Subject
}

// Computed types (not in DB)

export interface DailyOverview {
  date: string
  reviews_due: ReviewQueueItem[]
  planned_study: DailyPlan[]
  questions_done_today: number
  questions_target_today: number
  weekly_progress: number
  weekly_target: number
}

export interface SubjectStats {
  subject: Subject
  accuracy: number
  trend: 'improving' | 'stable' | 'declining'
  total_questions: number
  last_studied: string | null
  next_review: string | null
}

export interface WeeklyOverview {
  week_number: number
  phase: Phase
  target_questions: number
  actual_questions: number
  accuracy: number
  completion_pct: number
  days: DailyPlan[]
}
