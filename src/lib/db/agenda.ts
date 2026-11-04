import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { AgendaItem, AgendaStatus, AgendaType } from '../types'
import { format } from 'date-fns'

export async function getAgendaForDate(date: string): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*, subject:subjects(*, grade_lesson:grade_lessons(*))')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('planned_date', date)
    .order('type')
  if (error) throw error
  return data
}

export async function getAgendaRange(startDate: string, endDate: string): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*, subject:subjects(*, grade_lesson:grade_lessons(*))')
    .eq('user_id', DEFAULT_USER_ID)
    .gte('planned_date', startDate)
    .lte('planned_date', endDate)
    .order('planned_date')
  if (error) throw error
  return data
}

export async function getOverdueItems(): Promise<AgendaItem[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*, subject:subjects(*, grade_lesson:grade_lessons(*))')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('status', 'late')
    .lt('planned_date', today)
    .order('planned_date')
  if (error) throw error
  return data
}

export async function getTodayQuestionCount(): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('agenda_items')
    .select('done_questions')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('done_date', today)
    .eq('status', 'done')
  if (error) throw error
  return data.reduce((sum, item) => sum + (item.done_questions ?? 0), 0)
}

export async function completeAgendaItem(
  id: string,
  doneQuestions: number,
  correctQuestions: number
): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { error } = await supabase
    .from('agenda_items')
    .update({
      status: 'done' as AgendaStatus,
      done_date: today,
      done_questions: doneQuestions,
      correct_questions: correctQuestions,
    })
    .eq('id', id)
  if (error) throw error
}

export async function rescheduleItem(id: string, newDate: string): Promise<void> {
  const { error } = await supabase
    .from('agenda_items')
    .update({ planned_date: newDate, status: 'planned' as AgendaStatus })
    .eq('id', id)
  if (error) throw error
}

export async function createAgendaItem(item: Omit<AgendaItem, 'id' | 'created_at'>): Promise<AgendaItem> {
  const { data, error } = await supabase
    .from('agenda_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markOverdueItems(): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { error } = await supabase
    .from('agenda_items')
    .update({ status: 'late' as AgendaStatus })
    .eq('status', 'planned')
    .lt('planned_date', today)
    .eq('user_id', DEFAULT_USER_ID)
  if (error) throw error
}

export async function getAgendaStats(): Promise<{
  totalPlanned: number
  totalDone: number
  totalLate: number
}> {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('status')
    .eq('user_id', DEFAULT_USER_ID)
  if (error) throw error

  return {
    totalPlanned: data.filter(d => d.status === 'planned').length,
    totalDone: data.filter(d => d.status === 'done').length,
    totalLate: data.filter(d => d.status === 'late').length,
  }
}
