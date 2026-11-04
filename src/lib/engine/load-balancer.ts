import { addDays, format, differenceInMonths, isWeekend } from 'date-fns'
import type { AgendaItem, DailyLoad } from '../types'

/**
 * MR1 Load Balancer — PRD Section "Equilíbrio de carga"
 *
 * Daily: question limit starts 30, +5/month, max 80.
 * Overflow: shift reviews up to 15% of interval.
 * Simulado days: no reviews.
 * Weekly: 12h cap warning.
 */

// ─── Daily Question Limit ───

export function getDailyLimit(startDate: string, initialLimit: number = 30): number {
  const months = differenceInMonths(new Date(), new Date(startDate))
  return Math.min(80, initialLimit + months * 5)
}

// ─── Shift Overflowing Review ───

/**
 * If a day exceeds its question limit, shift the review to a nearby day.
 * Shift up to 15% of the review's interval, preferring later dates.
 * High incidence reviews get priority (shifted last).
 */
export function findShiftedDate(params: {
  originalDate: string
  intervalDays: number
  dailyLoads: Map<string, number>
  dailyLimit: number
  questionsToAdd: number
}): string {
  const { originalDate, intervalDays, dailyLoads, dailyLimit, questionsToAdd } = params
  const maxShift = Math.max(1, Math.ceil(intervalDays * 0.15))

  // Try days after first (prefer later), then before
  for (let offset = 1; offset <= maxShift; offset++) {
    const laterDate = format(addDays(new Date(originalDate), offset), 'yyyy-MM-dd')
    const laterLoad = dailyLoads.get(laterDate) ?? 0
    if (laterLoad + questionsToAdd <= dailyLimit) return laterDate
  }

  for (let offset = 1; offset <= maxShift; offset++) {
    const earlierDate = format(addDays(new Date(originalDate), -offset), 'yyyy-MM-dd')
    const earlierLoad = dailyLoads.get(earlierDate) ?? 0
    if (earlierLoad + questionsToAdd <= dailyLimit) return earlierDate
  }

  // If no good slot, keep original
  return originalDate
}

// ─── Check Weekly Hours ───

export function checkWeeklyHours(params: {
  items: AgendaItem[]
  weekdayHours: number
  weekendHours: number
}): { totalHours: number; exceedsLimit: boolean; heaviestLesson: AgendaItem | null } {
  const { items, weekdayHours, weekendHours } = params

  let totalHours = 0
  let heaviestLesson: AgendaItem | null = null
  let maxLessonTime = 0

  for (const item of items) {
    let hours: number
    switch (item.type) {
      case 'study':
        // Estimated from planned_questions or lesson duration
        hours = (item.planned_questions ?? 15) * 2 / 60 // ~2 min per question
        if (hours > maxLessonTime) {
          maxLessonTime = hours
          heaviestLesson = item
        }
        break
      case 'fixation':
      case 'review':
      case 'guaranteed_review':
        hours = (item.planned_questions ?? 10) * 1.5 / 60 // ~1.5 min per question
        break
      case 'simulado':
        hours = 5 // 5h for simulado + correction
        break
      default:
        hours = 0
    }
    totalHours += hours
  }

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    exceedsLimit: totalHours > 12,
    heaviestLesson,
  }
}

// ─── Build Daily Load Map ───

export function buildDailyLoadMap(
  items: AgendaItem[],
  startDate: string,
  days: number
): Map<string, DailyLoad> {
  const map = new Map<string, DailyLoad>()

  for (let i = 0; i < days; i++) {
    const date = format(addDays(new Date(startDate), i), 'yyyy-MM-dd')
    map.set(date, { date, questions: 0, items: [], isSimuladoDay: false, isOverLimit: false })
  }

  for (const item of items) {
    const load = map.get(item.planned_date)
    if (load) {
      load.items.push(item)
      load.questions += item.planned_questions ?? 0
      if (item.type === 'simulado') load.isSimuladoDay = true
    }
  }

  return map
}
