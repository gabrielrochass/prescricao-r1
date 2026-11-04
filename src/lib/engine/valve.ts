import type { GradeLesson } from '../types'

/**
 * MR1 Safety Valve — PRD "Válvula de segurança"
 *
 * If the plan invades the 6 final weeks, the app suggests
 * doing the 17 lowest-relevance Complementary lessons
 * with only Summary Lesson + questions (skipping full video).
 *
 * The user decides one by one; nothing is cut automatically.
 */

const VALVE_RELEVANCE_THRESHOLD = 1.0

/**
 * Get the 17 Complementary lessons eligible for the valve.
 * These are the ones with relevance ≤ 1.0 (very low).
 */
export function getValveEligibleLessons(lessons: GradeLesson[]): GradeLesson[] {
  return lessons
    .filter(l => l.category === 'complementary' && l.relevance <= VALVE_RELEVANCE_THRESHOLD)
    .sort((a, b) => a.relevance - b.relevance)
    .slice(0, 17)
}

/**
 * Calculate time saved by using valve on a lesson.
 * Saves the mandatory video duration, keeps only summary + questions.
 */
export function calculateTimeSaved(lesson: GradeLesson): {
  originalMin: number
  valveMin: number
  savedMin: number
} {
  const originalMin = lesson.mandatory_duration_min + lesson.emr_plus_duration_min
  const valveMin = lesson.summary_duration_min + 30 // summary + ~30 min of questions
  return {
    originalMin,
    valveMin,
    savedMin: originalMin - valveMin,
  }
}

/**
 * Total time saved if all 17 eligible lessons use the valve.
 */
export function calculateTotalValveSavings(lessons: GradeLesson[]): {
  eligible: GradeLesson[]
  totalSavedMin: number
  totalSavedHours: number
} {
  const eligible = getValveEligibleLessons(lessons)
  const totalSavedMin = eligible.reduce((sum, l) => {
    const { savedMin } = calculateTimeSaved(l)
    return sum + savedMin
  }, 0)

  return {
    eligible,
    totalSavedMin,
    totalSavedHours: Math.round(totalSavedMin / 60 * 10) / 10,
  }
}
