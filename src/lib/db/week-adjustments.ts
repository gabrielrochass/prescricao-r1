import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { WeekAdjustment } from '../types'

export async function getWeekAdjustment(weekStart: string): Promise<WeekAdjustment | null> {
  const { data, error } = await supabase
    .from('week_adjustments')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('week_start', weekStart)
    .single()
  if (error) return null
  return data
}

export async function upsertWeekAdjustment(params: {
  week_start: string
  available_hours?: number
  twelve_hour_warning_accepted?: boolean
  rotation_id?: string
}): Promise<void> {
  const { error } = await supabase
    .from('week_adjustments')
    .upsert({
      ...params,
      user_id: DEFAULT_USER_ID,
    }, { onConflict: 'week_start,user_id' })
  // If upsert fails due to no unique constraint, try insert
  if (error) {
    const { error: insertError } = await supabase
      .from('week_adjustments')
      .insert({ ...params, user_id: DEFAULT_USER_ID })
    if (insertError) throw insertError
  }
}
