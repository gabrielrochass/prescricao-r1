// MR1 Domain Types — matches PRD 9-entity schema

export type BigArea = 'Clínica Médica' | 'Cirurgia' | 'Pediatria' | 'Ginecologia e Obstetrícia' | 'Medicina Preventiva'
export type Category = 'essential' | 'important' | 'complementary'
export type Incidence = 'high' | 'medium' | 'low'
export type AgendaType = 'study' | 'fixation' | 'review' | 'simulado' | 'guaranteed_review'
export type AgendaStatus = 'planned' | 'done' | 'late'
export type SimuladoType = 'regular' | 'final_stretch'
export type Effort = 1 | 2 | 3 | 4 | 5

export interface User {
  id: string
  email: string
  display_name: string
  specialty: string
  daily_limit_initial: number
  daily_limit_current: number
  notification_morning: string
  notification_evening: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Exam {
  id: string
  name: string
  exam_date: string
  estimated: boolean
  reference_cutoff: number | null
  user_id: string
}

export interface Rotation {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  weekday_hours: number
  weekend_hours: number
  shifts_per_week: number
  new_topic_days: number[]
  is_active: boolean
  user_id: string
}

export interface GradeLesson {
  id: string
  emr_order: number
  name: string
  big_area: BigArea
  category: Category
  relevance: number
  sort_order: number
  mandatory_duration_min: number
  emr_plus_duration_min: number
  summary_duration_min: number
  linked_updates: string[] | null
}

export interface Subject {
  id: string
  grade_lesson_id: string
  incidence: Incidence
  incidence_auto: boolean
  effort: Effort | null
  study_date: string | null
  real_time_spent_min: number | null
  valve_used: boolean
  user_id: string
  grade_lesson?: GradeLesson
}

export interface AgendaItem {
  id: string
  type: AgendaType
  review_number: number | null
  planned_date: string
  done_date: string | null
  status: AgendaStatus
  planned_questions: number | null
  done_questions: number | null
  correct_questions: number | null
  interval_used: number | null
  subject_id: string | null
  simulado_id: string | null
  user_id: string
  created_at: string
  subject?: Subject & { grade_lesson?: GradeLesson }
}

export interface Simulado {
  id: string
  planned_date: string
  done_date: string | null
  type: SimuladoType
  corrected_date: string | null
  status: AgendaStatus
  user_id: string
  area_results?: AreaResult[]
}

export interface AreaResult {
  id: string
  big_area: BigArea
  errors: number
  correct: number
  simulado_id: string
}

export interface WeekAdjustment {
  id: string
  week_start: string
  available_hours: number | null
  twelve_hour_warning_accepted: boolean
  rotation_id: string | null
  user_id: string
}

// Engine types

export interface FixationResult {
  questions: number
  growthFactor: number
}

export interface ReviewLadderStep {
  reviewNumber: number
  intervalDays: number
  questions: number
  plannedDate: string
}

export interface AccuracyBand {
  label: string
  min: number
  max: number
  afterFixation: { intervalDays: number }
  afterReview: { intervalMultiplier: number; minDays: number }
  reviewQuestions: number
}

export interface DailyLoad {
  date: string
  questions: number
  items: AgendaItem[]
  isSimuladoDay: boolean
  isOverLimit: boolean
}
