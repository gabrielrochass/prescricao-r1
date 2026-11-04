import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { User } from '../types'

export async function getUser(): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', DEFAULT_USER_ID)
    .single()
  if (error) throw error
  return data
}

export async function updateUser(updates: Partial<User>): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', DEFAULT_USER_ID)
  if (error) throw error
}
