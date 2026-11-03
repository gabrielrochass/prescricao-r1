import { addDays, addWeeks, differenceInMonths, differenceInWeeks, format, isBefore, nextDay } from 'date-fns'
import type { MockExam, TargetExam } from './types'

type ExamType = 'general' | 'past_exam' | 'thematic'

interface PlannedSimulado {
  scheduled_date: string
  exam_type: ExamType
  source: string
  target_exam_id: string | null
  total_questions: number
}

/**
 * Generate simulado plan from start date until exam.
 *
 * Frequency by distance from exam:
 * - 6-12 months: 1x/month
 * - 3-6 months: 2x/month (biweekly)
 * - 1-3 months: 1x/week
 * - Last month: 2-3x/week
 *
 * Alternates between: general, past exams from target boards, thematic.
 */
export function generateSimuladoPlan(
  examDate: Date,
  startDate: Date,
  targetExams: TargetExam[],
  preferredWeekday: number = 6 // Saturday default
): PlannedSimulado[] {
  const plan: PlannedSimulado[] = []
  const primaryExam = targetExams.find(e => e.priority === 'primary') ?? targetExams[0]

  let currentDate = startDate
  const examSources = targetExams.map(e => e.name)

  // Rotation of exam types
  const typeRotation: ExamType[] = ['general', 'past_exam', 'thematic', 'past_exam']
  let typeIndex = 0

  while (isBefore(currentDate, examDate)) {
    const monthsUntilExam = differenceInMonths(examDate, currentDate)
    const weeksUntilExam = differenceInWeeks(examDate, currentDate)

    let intervalDays: number

    if (monthsUntilExam > 6) {
      intervalDays = 30 // monthly
    } else if (monthsUntilExam > 3) {
      intervalDays = 14 // biweekly
    } else if (weeksUntilExam > 4) {
      intervalDays = 7 // weekly
    } else if (weeksUntilExam > 1) {
      intervalDays = 3 // 2-3x/week in last month
    } else {
      break // last week: no simulado, just review
    }

    const examType = typeRotation[typeIndex % typeRotation.length]
    typeIndex++

    // Build source name
    let source: string
    if (examType === 'past_exam') {
      const examIdx = Math.floor(typeIndex / 2) % examSources.length
      const year = 2024 + (examIdx % 3)
      source = `${examSources[examIdx]} ${year}`
    } else if (examType === 'thematic') {
      source = 'Temático — temas fracos'
    } else {
      source = 'Simulado geral'
    }

    // Questions: 100 for full, 50 for thematic
    const totalQuestions = examType === 'thematic' ? 50 : 100

    plan.push({
      scheduled_date: format(currentDate, 'yyyy-MM-dd'),
      exam_type: examType,
      source,
      target_exam_id: primaryExam?.id ?? null,
      total_questions: totalQuestions,
    })

    currentDate = addDays(currentDate, intervalDays)
  }

  return plan
}

/**
 * Get recommended simulado frequency label for display.
 */
export function getSimuladoFrequency(
  monthsUntilExam: number
): string {
  if (monthsUntilExam > 6) return '1x por mês'
  if (monthsUntilExam > 3) return '2x por mês'
  if (monthsUntilExam > 1) return '1x por semana'
  return '2-3x por semana'
}

/**
 * Analyze simulado trend (accuracy over time).
 */
export function analyzeSimuladoTrend(
  mockExams: MockExam[]
): { trend: 'improving' | 'stable' | 'declining'; averageAccuracy: number; lastAccuracy: number } {
  const completed = mockExams
    .filter(m => m.status === 'done' && m.total_questions && m.correct_questions)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  if (completed.length === 0) {
    return { trend: 'stable', averageAccuracy: 0, lastAccuracy: 0 }
  }

  const accuracies = completed.map(m => (m.correct_questions! / m.total_questions!) * 100)
  const avg = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
  const last = accuracies[accuracies.length - 1]

  // Simple trend from last 3
  const recent = accuracies.slice(-3)
  let trend: 'improving' | 'stable' | 'declining' = 'stable'

  if (recent.length >= 2) {
    const diff = recent[recent.length - 1] - recent[0]
    if (diff > 5) trend = 'improving'
    else if (diff < -5) trend = 'declining'
  }

  return { trend, averageAccuracy: Math.round(avg), lastAccuracy: Math.round(last) }
}
