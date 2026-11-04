import { supabase } from '../supabase'
import type { GradeLesson } from '../types'

export async function getGradeLessons(): Promise<GradeLesson[]> {
  const { data, error } = await supabase
    .from('grade_lessons')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function getGradeLessonsByCategory(category: string): Promise<GradeLesson[]> {
  const { data, error } = await supabase
    .from('grade_lessons')
    .select('*')
    .eq('category', category)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function getGradeLessonsByArea(bigArea: string): Promise<GradeLesson[]> {
  const { data, error } = await supabase
    .from('grade_lessons')
    .select('*')
    .eq('big_area', bigArea)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function getGradeLesson(id: string): Promise<GradeLesson | null> {
  const { data, error } = await supabase
    .from('grade_lessons')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
