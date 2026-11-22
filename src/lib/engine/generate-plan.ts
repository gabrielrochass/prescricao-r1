import { addDays, addWeeks, format, isBefore, getDay } from 'date-fns'
import { supabase, DEFAULT_USER_ID } from '../supabase'
import type { GradeLesson } from '../types'
import { generateSimuladoDates, distributeLessons, isVacationWeek, PLAN_START, PHASE_1_END, PHASE_2_END } from './scheduler'

/**
 * Generate the full study plan:
 * 1. Skeleton slots: "Estudo novo" + "Fixação" on alternating days
 * 2. Simulados on scheduled dates
 *
 * Pattern per week (based on PDR/Medcurso/EMR methodology):
 * - 2-3 study days (Mon, Wed, Fri or as configured)
 * - Fixation on the day after each study (Tue, Thu, Sat)
 * - Sunday: simulado (when scheduled) or rest
 * - ~30 questions/day for fixation, growing over time
 *
 * Slots are skeleton — no subject assigned. User picks the topic
 * when they actually study via Adicionar.
 */
export async function generateFullPlan(lessons: GradeLesson[]): Promise<{
  slotsCreated: number
  simuladosCreated: number
}> {
  const examDate = '2027-12-19'
  const finalStretchStart = '2027-11-07'

  // Count total weeks of content
  const phase1Lessons = lessons.filter(l => l.category === 'essential' || l.category === 'important')
  const phase2Lessons = lessons.filter(l => l.category === 'complementary')
  const totalLessons = phase1Lessons.length + phase2Lessons.length

  // Study days pattern: Mon(1), Wed(3), Fri(5)
  // Fixation days: Tue(2), Thu(4), Sat(6)
  const studyDays = [1, 3, 5]
  const fixationDays = [2, 4, 6]

  // Base questions for fixation (grows over time per PRD: 30 start, +5/month)
  const baseFixationQ = 20

  // Generate skeleton slots week by week
  let currentWeek = new Date(PLAN_START + 'T12:00:00')
  const examEnd = new Date(examDate)
  const finalStart = new Date(finalStretchStart)
  let slotsCreated = 0
  let weekNumber = 0

  // Batch inserts for performance
  const allSlots: any[] = []

  while (isBefore(currentWeek, finalStart)) {
    const weekStr = format(currentWeek, 'yyyy-MM-dd')

    // Skip vacation weeks
    if (isVacationWeek(weekStr)) {
      currentWeek = addWeeks(currentWeek, 1)
      continue
    }

    weekNumber++

    // Determine lessons per week based on phase
    const inPhase1 = isBefore(currentWeek, new Date(PHASE_1_END))
    const lessonsThisWeek = inPhase1 ? Math.min(2, studyDays.length) : Math.min(3, studyDays.length)

    // Question count grows: base + (weekNumber / 4) * 5
    const fixQ = Math.min(80, baseFixationQ + Math.floor(weekNumber / 4) * 5)

    for (let i = 0; i < lessonsThisWeek; i++) {
      // Study slot
      const studyDow = studyDays[i]
      const currentDow = getDay(currentWeek)
      const studyOffset = (studyDow - currentDow + 7) % 7
      const studyDate = addDays(currentWeek, studyOffset)

      if (!isBefore(studyDate, finalStart)) break

      allSlots.push({
        type: 'study',
        planned_date: format(studyDate, 'yyyy-MM-dd'),
        status: 'planned',
        planned_questions: null, // study = aula, sem questões
        subject_id: null,
        simulado_id: null,
        user_id: DEFAULT_USER_ID,
        review_number: null,
        done_date: null,
        done_questions: null,
        correct_questions: null,
        interval_used: null,
      })

      // Fixation slot (day after study)
      const fixDate = addDays(studyDate, 1)
      if (!isBefore(fixDate, finalStart)) continue

      allSlots.push({
        type: 'fixation',
        planned_date: format(fixDate, 'yyyy-MM-dd'),
        status: 'planned',
        planned_questions: fixQ,
        subject_id: null,
        simulado_id: null,
        user_id: DEFAULT_USER_ID,
        review_number: null,
        done_date: null,
        done_questions: null,
        correct_questions: null,
        interval_used: null,
      })
    }

    currentWeek = addWeeks(currentWeek, 1)
  }

  // Insert slots in batches of 50
  for (let i = 0; i < allSlots.length; i += 50) {
    const batch = allSlots.slice(i, i + 50)
    const { error } = await supabase.from('agenda_items').insert(batch)
    if (error) {
      console.error('Error inserting study slots batch:', error)
    } else {
      slotsCreated += batch.length
    }
  }

  // Generate simulados
  const simuladoDates = generateSimuladoDates(PLAN_START, examDate)
  let simuladosCreated = 0

  for (const sim of simuladoDates) {
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

    const { error: agendaError } = await supabase
      .from('agenda_items')
      .insert({
        type: 'simulado',
        planned_date: sim.date,
        status: 'planned',
        planned_questions: 100,
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

  return { slotsCreated, simuladosCreated }
}
