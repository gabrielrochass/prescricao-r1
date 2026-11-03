import { supabase } from './supabase'
import type {
  Subject, StudyEntry, ReviewQueueItem, SubjectMastery,
  ProgressionConfig, WeeklyTarget, DailyPlan, MockExam,
  UserSettings, TargetExam, StudySchedule, MockExamBreakdown,
  WeeklyPlan, WeeklyPlanTopic,
} from './types'
import { format } from 'date-fns'

// ─── Subjects ───

export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data
}

export async function getSubjectsTree(): Promise<Subject[]> {
  const all = await getSubjects()
  const map = new Map<string, Subject>()
  const roots: Subject[] = []

  for (const s of all) {
    map.set(s.id, { ...s, children: [] })
  }

  for (const s of all) {
    const node = map.get(s.id)!
    if (s.parent_id) {
      const parent = map.get(s.parent_id)
      parent?.children?.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// ─── Study Entries ───

export async function getStudyEntries(date?: string): Promise<StudyEntry[]> {
  let query = supabase
    .from('study_entries')
    .select('*, subject:subjects(*)')
    .order('created_at', { ascending: false })

  if (date) query = query.eq('date', date)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createStudyEntry(entry: Omit<StudyEntry, 'id' | 'created_at' | 'subject'>): Promise<StudyEntry> {
  const { data, error } = await supabase
    .from('study_entries')
    .insert(entry)
    .select('*, subject:subjects(*)')
    .single()
  if (error) throw error
  return data
}

export async function getTodayQuestionCount(): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('study_entries')
    .select('total_questions')
    .eq('date', today)
    .eq('study_type', 'questions')
  if (error) throw error
  return data.reduce((sum, e) => sum + (e.total_questions ?? 0), 0)
}

// ─── Reviews ───

export async function getPendingReviews(date?: string): Promise<ReviewQueueItem[]> {
  let query = supabase
    .from('review_queue')
    .select('*, subject:subjects(*)')
    .eq('status', 'pending')
    .order('priority', { ascending: false })

  if (date) {
    query = query.lte('scheduled_date', date)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateReviewStatus(id: string, status: ReviewQueueItem['status']): Promise<void> {
  const { error } = await supabase
    .from('review_queue')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function createReview(review: Omit<ReviewQueueItem, 'id' | 'created_at' | 'subject'>): Promise<void> {
  const { error } = await supabase.from('review_queue').insert(review)
  if (error) throw error
}

// ─── Subject Mastery ───

export async function getSubjectMasteries(): Promise<SubjectMastery[]> {
  const { data, error } = await supabase
    .from('subject_mastery')
    .select('*, subject:subjects(*)')
  if (error) throw error
  return data
}

export async function upsertSubjectMastery(mastery: Partial<SubjectMastery> & { subject_id: string }): Promise<void> {
  const { error } = await supabase
    .from('subject_mastery')
    .upsert(mastery, { onConflict: 'subject_id' })
  if (error) throw error
}

// ─── Progression ───

export async function getProgressionConfig(): Promise<ProgressionConfig | null> {
  const { data, error } = await supabase
    .from('progression_config')
    .select('*')
    .single()
  if (error) return null
  return data
}

export async function updateProgressionConfig(config: Partial<ProgressionConfig>): Promise<void> {
  const { error } = await supabase
    .from('progression_config')
    .update({ ...config, updated_at: new Date().toISOString() })
    .not('id', 'is', null) // update the single row
  if (error) throw error
}

// ─── Weekly Targets ───

export async function getWeeklyTargets(): Promise<WeeklyTarget[]> {
  const { data, error } = await supabase
    .from('weekly_targets')
    .select('*')
    .order('week_number')
  if (error) throw error
  return data
}

export async function getCurrentWeeklyTarget(): Promise<WeeklyTarget | null> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('weekly_targets')
    .select('*')
    .lte('week_start_date', today)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}

// ─── Daily Plan ───

export async function getDailyPlan(date: string): Promise<DailyPlan[]> {
  const { data, error } = await supabase
    .from('daily_plan')
    .select('*, subject:subjects(*)')
    .eq('date', date)
    .order('plan_type')
  if (error) throw error
  return data
}

// ─── Mock Exams ───

export async function getMockExams(): Promise<MockExam[]> {
  const { data, error } = await supabase
    .from('mock_exams')
    .select('*, target_exam:target_exams(*)')
    .order('scheduled_date')
  if (error) throw error
  return data
}

export async function getUpcomingMockExam(): Promise<MockExam | null> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('mock_exams')
    .select('*, target_exam:target_exams(*)')
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
    .order('scheduled_date')
    .limit(1)
    .single()
  if (error) return null
  return data
}

export async function updateMockExam(id: string, update: Partial<MockExam>): Promise<void> {
  const { error } = await supabase.from('mock_exams').update(update).eq('id', id)
  if (error) throw error
}

// ─── Target Exams ───

export async function getTargetExams(): Promise<TargetExam[]> {
  const { data, error } = await supabase
    .from('target_exams')
    .select('*')
    .order('exam_date')
  if (error) throw error
  return data
}

// ─── User Settings ───

export async function getUserSettings(): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .not('id', 'is', null)
  if (error) throw error
}

// ─── Study Schedule ───

export async function getStudySchedule(): Promise<StudySchedule[]> {
  const { data, error } = await supabase
    .from('study_schedule')
    .select('*')
    .eq('active', true)
    .order('weekday')
    .order('start_time')
  if (error) throw error
  return data
}

// ─── Weekly Plan ───

export async function getWeeklyPlans(): Promise<WeeklyPlan[]> {
  const { data, error } = await supabase
    .from('weekly_plan')
    .select('*, topics:weekly_plan_topics(*, subject:subjects(*))')
    .order('week_start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getCurrentWeeklyPlan(): Promise<WeeklyPlan | null> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('weekly_plan')
    .select('*, topics:weekly_plan_topics(*, subject:subjects(*))')
    .lte('week_start_date', today)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}

export async function createWeeklyPlan(plan: {
  week_start_date: string
  week_label?: string
  notes?: string
}): Promise<WeeklyPlan> {
  const { data, error } = await supabase
    .from('weekly_plan')
    .insert(plan)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addWeeklyPlanTopic(topic: {
  weekly_plan_id: string
  subject_id: string
  goal?: string
  question_target?: number
  order_index?: number
}): Promise<WeeklyPlanTopic> {
  const { data, error } = await supabase
    .from('weekly_plan_topics')
    .insert(topic)
    .select('*, subject:subjects(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateWeeklyPlanTopic(
  id: string,
  update: Partial<WeeklyPlanTopic>
): Promise<void> {
  const { error } = await supabase
    .from('weekly_plan_topics')
    .update(update)
    .eq('id', id)
  if (error) throw error
}

export async function deleteWeeklyPlanTopic(id: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_plan_topics')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function deleteWeeklyPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_plan')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Stats helpers ───

export async function getWeeklyStats(weekStartDate: string): Promise<{
  totalQuestions: number
  totalCorrect: number
  accuracy: number
  entriesCount: number
}> {
  const { data, error } = await supabase
    .from('study_entries')
    .select('total_questions, correct_questions')
    .gte('date', weekStartDate)
    .eq('study_type', 'questions')
  if (error) throw error

  const totalQuestions = data.reduce((sum, e) => sum + (e.total_questions ?? 0), 0)
  const totalCorrect = data.reduce((sum, e) => sum + (e.correct_questions ?? 0), 0)

  return {
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    entriesCount: data.length,
  }
}
