import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { Subject, Effort, Incidence } from '../types'
import { format } from 'date-fns'

export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, grade_lesson:grade_lessons(*)')
    .eq('user_id', DEFAULT_USER_ID)
    .order('created_at')
  if (error) throw error
  return data
}

export async function getSubject(id: string): Promise<Subject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, grade_lesson:grade_lessons(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createSubject(params: {
  grade_lesson_id: string
  incidence: Incidence
  effort: Effort
  real_time_spent_min?: number
}): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      ...params,
      incidence_auto: true,
      study_date: format(new Date(), 'yyyy-MM-dd'),
      user_id: DEFAULT_USER_ID,
    })
    .select('*, grade_lesson:grade_lessons(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateSubjectIncidence(id: string, incidence: Incidence): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .update({ incidence, incidence_auto: false })
    .eq('id', id)
  if (error) throw error
}

export async function getStudiedLessonIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('grade_lesson_id')
    .eq('user_id', DEFAULT_USER_ID)
  if (error) throw error
  return data.map(d => d.grade_lesson_id)
}

export async function getSubjectCount(): Promise<number> {
  const { count, error } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', DEFAULT_USER_ID)
  if (error) throw error
  return count ?? 0
}
