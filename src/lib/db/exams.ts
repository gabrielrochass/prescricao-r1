import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { Exam } from '../types'

export async function getExams(): Promise<Exam[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .order('exam_date')
  if (error) throw error
  return data
}

export async function getPrimaryExam(): Promise<Exam | null> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('name', 'SES-PE 2028')
    .single()
  if (error) return null
  return data
}

export async function updateExam(id: string, updates: Partial<Exam>): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}
