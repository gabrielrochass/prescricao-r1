import { addDays, addWeeks, format, isBefore, isAfter, differenceInDays, isSunday, nextSunday } from 'date-fns'
import type { GradeLesson, Exam, Rotation, Incidence, SimuladoType } from '../types'
import { categoryToIncidence } from './review-engine'

/**
 * MR1 Scheduler — PRD Section "Plano do ano"
 *
 * Phase 1: 09/11/2026 → 10/05/2027 (Essential + Important)
 * Phase 2: 10/05/2027 → 01/11/2027 (remaining Complementary)
 * Final stretch: 07/11/2027 → 19/12/2027 (review + simulados only)
 *
 * Constraints:
 * - Max 3 lessons per week, ~4h40 of video
 * - Heavy + light lesson pairing
 * - 4 vacation weeks: Natal/Ano-Novo, Carnaval, 2 reserve
 * - Simulados: monthly → bimonthly → weekly
 */

const PLAN_START = '2026-11-09'
const PHASE_1_END = '2027-05-10'
const PHASE_2_END = '2027-11-01'
const FINAL_STRETCH_START = '2027-11-07'
const MAX_LESSONS_PER_WEEK = 3
const MAX_VIDEO_MINUTES_PER_WEEK = 280 // ~4h40

// Vacation weeks (no new lessons)
const VACATION_WEEKS = [
  { start: '2026-12-23', end: '2026-12-29' }, // Natal
  { start: '2026-12-30', end: '2027-01-05' }, // Ano-Novo
  { start: '2027-02-24', end: '2027-03-02' }, // Carnaval
  // 2 reserve weeks — used dynamically
]

export function getPhase(date: string): 'phase1' | 'phase2' | 'final_stretch' | 'post_exam' {
  const d = new Date(date)
  if (isBefore(d, new Date(PHASE_1_END))) return 'phase1'
  if (isBefore(d, new Date(PHASE_2_END))) return 'phase2'
  if (isBefore(d, new Date('2027-12-20'))) return 'final_stretch'
  return 'post_exam'
}

export function getPhaseName(phase: string): string {
  switch (phase) {
    case 'phase1': return 'Fase 1'
    case 'phase2': return 'Fase 2'
    case 'final_stretch': return 'Reta Final'
    default: return ''
  }
}

export function isVacationWeek(date: string): boolean {
  const d = new Date(date)
  return VACATION_WEEKS.some(v => !isBefore(d, new Date(v.start)) && !isAfter(d, new Date(v.end)))
}

// ─── Simulado Schedule ───

export function getSimuladoFrequency(date: string): 'monthly' | 'bimonthly' | 'weekly' {
  const phase = getPhase(date)
  if (phase === 'phase1') return 'monthly'
  if (phase === 'phase2') return 'bimonthly'
  return 'weekly'
}

/**
 * Generate planned simulado dates.
 * Monthly: 4th Sunday. Bimonthly: 2nd + 4th Sunday. Weekly: every Sunday.
 */
export function generateSimuladoDates(startDate: string, examDate: string): { date: string; type: SimuladoType }[] {
  const dates: { date: string; type: SimuladoType }[] = []
  let current = new Date(startDate)
  const exam = new Date(examDate)
  const finalStart = new Date(FINAL_STRETCH_START)

  while (isBefore(current, exam)) {
    if (isVacationWeek(format(current, 'yyyy-MM-dd'))) {
      current = addDays(current, 7)
      continue
    }

    const freq = getSimuladoFrequency(format(current, 'yyyy-MM-dd'))
    const type: SimuladoType = isAfter(current, finalStart) ? 'final_stretch' : 'regular'

    // Find next Sunday
    const sunday = isSunday(current) ? current : nextSunday(current)
    if (isAfter(sunday, exam)) break

    const dateStr = format(sunday, 'yyyy-MM-dd')

    if (freq === 'weekly') {
      dates.push({ date: dateStr, type })
      current = addDays(sunday, 7)
    } else if (freq === 'bimonthly') {
      // 2nd and 4th Sundays
      const dayOfMonth = sunday.getDate()
      if ((dayOfMonth >= 8 && dayOfMonth <= 14) || (dayOfMonth >= 22 && dayOfMonth <= 28)) {
        dates.push({ date: dateStr, type })
      }
      current = addDays(sunday, 7)
    } else {
      // Monthly: 4th Sunday
      const dayOfMonth = sunday.getDate()
      if (dayOfMonth >= 22 && dayOfMonth <= 28) {
        dates.push({ date: dateStr, type })
      }
      current = addDays(sunday, 7)
    }
  }

  return dates
}

// ─── Lesson Distribution ───

/**
 * Distribute lessons across weeks. Returns array of {lesson, weekStart} pairs.
 * Phase 1: Essential + Important (51 lessons)
 * Phase 2: Complementary (61 lessons)
 */
export function distributeLessons(
  lessons: GradeLesson[],
  startDate: string,
  endDate: string,
): { lesson: GradeLesson; weekStart: string }[] {
  const result: { lesson: GradeLesson; weekStart: string }[] = []
  let weekStart = new Date(startDate)
  const end = new Date(endDate)
  let lessonIdx = 0

  while (isBefore(weekStart, end) && lessonIdx < lessons.length) {
    const weekStr = format(weekStart, 'yyyy-MM-dd')

    // Skip vacation weeks
    if (isVacationWeek(weekStr)) {
      weekStart = addWeeks(weekStart, 1)
      continue
    }

    // Up to 3 lessons per week, respecting video cap
    let weekVideoMin = 0
    let weekLessons = 0

    while (
      lessonIdx < lessons.length &&
      weekLessons < MAX_LESSONS_PER_WEEK &&
      weekVideoMin + lessons[lessonIdx].mandatory_duration_min + lessons[lessonIdx].emr_plus_duration_min <= MAX_VIDEO_MINUTES_PER_WEEK + 60 // some slack
    ) {
      const lesson = lessons[lessonIdx]
      result.push({ lesson, weekStart: weekStr })
      weekVideoMin += lesson.mandatory_duration_min + lesson.emr_plus_duration_min
      weekLessons++
      lessonIdx++
    }

    weekStart = addWeeks(weekStart, 1)
  }

  return result
}

export { PLAN_START, PHASE_1_END, PHASE_2_END, FINAL_STRETCH_START }
