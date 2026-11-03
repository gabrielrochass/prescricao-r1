import { differenceInWeeks } from 'date-fns'
import type { Phase, ProgressionConfig } from './types'

interface WeeklyTargetResult {
  targetQuestions: number
  dailyTarget: number
  phase: Phase
  adjusted: boolean
  reason: string | null
}

const PHASE_RANGES: Record<Phase, [number, number]> = {
  adaptation: [1, 2],
  base: [3, 6],
  consolidation: [7, 12],
  intensification: [13, 20],
  final: [21, Infinity],
}

/**
 * Determine which phase the student is in based on week number.
 */
export function getPhase(weekNumber: number): Phase {
  for (const [phase, [start, end]] of Object.entries(PHASE_RANGES)) {
    if (weekNumber >= start && weekNumber <= end) return phase as Phase
  }
  return 'final'
}

/**
 * Get phase display name in Portuguese.
 */
export function getPhaseName(phase: Phase): string {
  const names: Record<Phase, string> = {
    adaptation: 'Adaptação',
    base: 'Base',
    consolidation: 'Consolidação',
    intensification: 'Intensificação',
    final: 'Reta Final',
  }
  return names[phase]
}

/**
 * Calculate weekly question target based on progression config and performance.
 *
 * Rules:
 * - Weekly increment: config.weeklyIncrementPct (default 12%)
 * - accuracy < 50%: reduce volume 15%, stay in phase
 * - accuracy < 60%: reduce volume 10%, stay in phase
 * - accuracy < 65%: maintain volume, don't progress
 * - accuracy >= 65%: progress normally
 */
export function calculateWeeklyTarget(
  config: ProgressionConfig,
  weekNumber: number,
  lastWeekAccuracy: number | null
): WeeklyTargetResult {
  const phase = getPhase(weekNumber)
  const incrementRate = 1 + config.weekly_increment_pct / 100

  // Base target: compound growth from initial
  let baseDaily = config.initial_daily_questions * Math.pow(incrementRate, weekNumber - 1)

  // Cap at target
  baseDaily = Math.min(baseDaily, config.target_daily_questions)

  let adjusted = false
  let reason: string | null = null

  // Adjust based on last week's accuracy
  if (lastWeekAccuracy !== null) {
    if (lastWeekAccuracy < 50) {
      baseDaily *= 0.85
      adjusted = true
      reason = `Accuracy ${lastWeekAccuracy.toFixed(0)}% (<50%) — volume reduzido 15% pra focar revisão`
    } else if (lastWeekAccuracy < 60) {
      baseDaily *= 0.90
      adjusted = true
      reason = `Accuracy ${lastWeekAccuracy.toFixed(0)}% (<60%) — volume reduzido 10%`
    } else if (lastWeekAccuracy < config.min_accuracy_to_progress) {
      // Keep same as last week's target essentially (no growth)
      baseDaily = config.initial_daily_questions * Math.pow(incrementRate, Math.max(weekNumber - 2, 0))
      baseDaily = Math.min(baseDaily, config.target_daily_questions)
      adjusted = true
      reason = `Accuracy ${lastWeekAccuracy.toFixed(0)}% (<${config.min_accuracy_to_progress}%) — volume mantido`
    }
  }

  // Enforce minimum
  baseDaily = Math.max(baseDaily, 10)

  const dailyTarget = Math.round(baseDaily)
  const studyDays = 6 // assume 6 study days per week
  const targetQuestions = dailyTarget * studyDays

  return {
    targetQuestions,
    dailyTarget,
    phase,
    adjusted,
    reason,
  }
}

/**
 * Distribute weekly target across study days.
 * Accounts for rest days and simulado days.
 */
export function distributeWeeklyToDaily(
  weeklyTarget: number,
  studyDays: number[],  // weekdays that have study (0=Sun, 1=Mon, etc.)
  simuladoDay: number | null // weekday for simulado, or null
): { weekday: number; questions: number; type: 'study' | 'simulado' }[] {
  const plan: { weekday: number; questions: number; type: 'study' | 'simulado' }[] = []

  // Reserve questions for simulado day
  let simuladoQuestions = 0
  if (simuladoDay !== null && studyDays.includes(simuladoDay)) {
    simuladoQuestions = Math.min(100, Math.round(weeklyTarget * 0.25))
  }

  const remainingQuestions = weeklyTarget - simuladoQuestions
  const regularDays = studyDays.filter(d => d !== simuladoDay)
  const perDay = Math.round(remainingQuestions / Math.max(regularDays.length, 1))

  for (const day of regularDays) {
    plan.push({ weekday: day, questions: perDay, type: 'study' })
  }

  if (simuladoDay !== null && studyDays.includes(simuladoDay)) {
    plan.push({ weekday: simuladoDay, questions: simuladoQuestions, type: 'simulado' })
  }

  return plan.sort((a, b) => a.weekday - b.weekday)
}

/**
 * Calculate current week number based on start date.
 */
export function getCurrentWeek(startDate: string): number {
  return Math.max(1, differenceInWeeks(new Date(), new Date(startDate)) + 1)
}

/**
 * Generate full progression plan preview (all weeks until exam).
 */
export function generateProgressionPreview(
  config: ProgressionConfig
): { week: number; phase: Phase; dailyTarget: number; weeklyTarget: number }[] {
  const totalWeeks = differenceInWeeks(new Date(config.exam_date), new Date(config.start_date))
  const preview: { week: number; phase: Phase; dailyTarget: number; weeklyTarget: number }[] = []

  for (let w = 1; w <= totalWeeks; w++) {
    const result = calculateWeeklyTarget(config, w, 70) // assume 70% for preview
    preview.push({
      week: w,
      phase: result.phase,
      dailyTarget: result.dailyTarget,
      weeklyTarget: result.targetQuestions,
    })
  }

  return preview
}
