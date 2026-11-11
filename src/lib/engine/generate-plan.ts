import { addDays, addWeeks, format, isBefore, isSunday, nextSunday, getDay } from 'date-fns'
import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { GradeLesson } from '../types'
import { generateSimuladoDates, distributeLessons, PLAN_START, PHASE_1_END, PHASE_2_END } from './scheduler'

/**
 * Generate the full study plan: distribute lessons + schedule simulados.
 * Called once after onboarding completes.
 */
export async function generateFullPlan(lessons: GradeLesson[]): Promise<{
  lessonsDistributed: number
  simuladosCreated: number
}> {
  const examDate = '2027-12-19'

  // 1. Distribute lessons into weeks
  const phase1Lessons = lessons.filter(l => l.category === 'essential' || l.category === 'important')
    .sort((a, b) => a.sort_order - b.sort_order)
  const phase2Lessons = lessons.filter(l => l.category === 'complementary')
    .sort((a, b) => a.sort_order - b.sort_order)

  const phase1Distribution = distributeLessons(phase1Lessons, PLAN_START, PHASE_1_END)
  const phase2Distribution = distributeLessons(phase2Lessons, PHASE_1_END, PHASE_2_END)
  const allDistributed = [...phase1Distribution, ...phase2Distribution]

  // 2. Create planned study agenda items for each lesson
  // Assign to specific days within the week (Mon, Wed, Fri by default)
  const studyDays = [1, 3, 5] // Mon, Wed, Fri

  const studyItems: {
    type: string
    planned_date: string
    status: string
    planned_questions: number | null
    subject_id: string | null
    simulado_id: string | null
    user_id: string
    review_number: number | null
    done_date: string | null
    done_questions: number | null
    correct_questions: number | null
    interval_used: number | null
  }[] = []

  let dayIndex = 0
  for (const { lesson, weekStart } of allDistributed) {
    // Pick the next study day in the week
    const dayOfWeek = studyDays[dayIndex % studyDays.length]
    dayIndex++

    // Find the actual date for this day of week within the week
    const weekStartDate = new Date(weekStart + 'T12:00:00')
    let studyDate = weekStartDate
    const currentDow = getDay(weekStartDate)
    const daysToAdd = (dayOfWeek - currentDow + 7) % 7
    studyDate = addDays(weekStartDate, daysToAdd)

    studyItems.push({
      type: 'study',
      planned_date: format(studyDate, 'yyyy-MM-dd'),
      status: 'planned',
      planned_questions: null, // study = watch lesson, no questions
      subject_id: null, // will be created when user actually studies
      simulado_id: null,
      user_id: DEFAULT_USER_ID,
      review_number: null,
      done_date: null,
      done_questions: null,
      correct_questions: null,
      interval_used: null,
    })
  }

  // We can't insert study items without subject_id due to constraint.
  // Instead, we just generate simulados — lessons show as "planned" in the grade list.
  // The user registers each study manually via Adicionar, which creates the full chain.

  // 3. Generate simulado dates and insert them
  const simuladoDates = generateSimuladoDates(PLAN_START, examDate)

  let simuladosCreated = 0

  for (const sim of simuladoDates) {
    // Create simulado record
    const { data: simulado, error: simError } = await supabase
      .from('simulados')
      .insert({
        planned_date: sim.date,
        type: sim.type,
        status: 'planned',
        user_id: DEFAULT_USER_ID,
      })
      .select()
      .single()

    if (simError) {
      console.error('Error creating simulado:', simError)
      continue
    }

    // Create agenda item for the simulado
    const { error: agendaError } = await supabase
      .from('agenda_items')
      .insert({
        type: 'simulado',
        planned_date: sim.date,
        status: 'planned',
        planned_questions: 100, // 5 areas × 20 questions
        subject_id: null,
        simulado_id: simulado.id,
        user_id: DEFAULT_USER_ID,
        review_number: null,
        done_date: null,
        done_questions: null,
        correct_questions: null,
        interval_used: null,
      })

    if (!agendaError) simuladosCreated++
  }

  return {
    lessonsDistributed: allDistributed.length,
    simuladosCreated,
  }
}
