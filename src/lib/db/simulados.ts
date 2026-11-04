import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { Simulado, AreaResult, BigArea } from '../types'

export async function getSimulados(): Promise<Simulado[]> {
  const { data, error } = await supabase
    .from('simulados')
    .select('*, area_results(*)')
    .eq('user_id', DEFAULT_USER_ID)
    .order('planned_date')
  if (error) throw error
  return data
}

export async function createSimulado(params: {
  planned_date: string
  type: 'regular' | 'final_stretch'
}): Promise<Simulado> {
  const { data, error } = await supabase
    .from('simulados')
    .insert({ ...params, user_id: DEFAULT_USER_ID })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recordSimuladoResults(
  simuladoId: string,
  results: { big_area: BigArea; errors: number; correct: number }[]
): Promise<void> {
  const { error: updateError } = await supabase
    .from('simulados')
    .update({ status: 'done', done_date: new Date().toISOString().split('T')[0] })
    .eq('id', simuladoId)

  if (updateError) throw updateError

  const rows = results.map(r => ({ ...r, simulado_id: simuladoId }))
  const { error } = await supabase.from('area_results').insert(rows)
  if (error) throw error
}

export async function correctSimulado(simuladoId: string, correctedDate: string): Promise<void> {
  const { error } = await supabase
    .from('simulados')
    .update({ corrected_date: correctedDate })
    .eq('id', simuladoId)
  if (error) throw error
}

export async function getSimuladoWithResults(id: string): Promise<Simulado | null> {
  const { data, error } = await supabase
    .from('simulados')
    .select('*, area_results(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getCompletedSimulados(): Promise<Simulado[]> {
  const { data, error } = await supabase
    .from('simulados')
    .select('*, area_results(*)')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('status', 'done')
    .order('done_date')
  if (error) throw error
  return data
}
