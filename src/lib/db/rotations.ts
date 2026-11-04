import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { Rotation } from '../types'

export async function getRotations(): Promise<Rotation[]> {
  const { data, error } = await supabase
    .from('rotations')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .order('start_date')
  if (error) throw error
  return data
}

export async function getActiveRotation(): Promise<Rotation | null> {
  const { data, error } = await supabase
    .from('rotations')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('is_active', true)
    .single()
  if (error) return null
  return data
}

export async function getRotation(id: string): Promise<Rotation | null> {
  const { data, error } = await supabase
    .from('rotations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createRotation(params: {
  name: string
  start_date?: string
  end_date?: string
  weekday_hours: number
  weekend_hours: number
  shifts_per_week: number
  new_topic_days: number[]
}): Promise<Rotation> {
  const { data, error } = await supabase
    .from('rotations')
    .insert({ ...params, user_id: DEFAULT_USER_ID })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRotation(id: string, updates: Partial<Rotation>): Promise<void> {
  const { error } = await supabase
    .from('rotations')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteRotation(id: string): Promise<void> {
  const { error } = await supabase
    .from('rotations')
    .delete()
    .eq('id', id)
  if (error) throw error
}
