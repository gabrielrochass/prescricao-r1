import { addDays, format, differenceInDays } from 'date-fns'
import type { Effort, Incidence, AccuracyBand } from '../types'

/**
 * MR1 Review Engine — PRD Section "Motor de revisão"
 *
 * 4 accuracy bands determine next interval.
 * Effort (1-5) determines fixation question count and growth factor.
 * Incidence adjusts question count and interval caps.
 * Max 6 ladder reviews + 1 guaranteed review in final stretch.
 */

// ─── Accuracy Bands ───

export const ACCURACY_BANDS: AccuracyBand[] = [
  {
    label: 'domínio',
    min: 85, max: 100,
    afterFixation: { intervalDays: 7 },
    afterReview: { intervalMultiplier: -1, minDays: 7 }, // uses effort growth factor
    reviewQuestions: 10,
  },
  {
    label: 'bom',
    min: 70, max: 84,
    afterFixation: { intervalDays: 4 },
    afterReview: { intervalMultiplier: 1.5, minDays: 4 },
    reviewQuestions: 10,
  },
  {
    label: 'atenção',
    min: 50, max: 69,
    afterFixation: { intervalDays: 2 },
    afterReview: { intervalMultiplier: 0.5, minDays: 2 },
    reviewQuestions: 15,
  },
  {
    label: 'rever teoria',
    min: 0, max: 49,
    afterFixation: { intervalDays: 1 },
    afterReview: { intervalMultiplier: 0, minDays: 1 }, // reset to start
    reviewQuestions: 20,
  },
]

export function getAccuracyBand(accuracy: number): AccuracyBand {
  return ACCURACY_BANDS.find(b => accuracy >= b.min && accuracy <= b.max) ?? ACCURACY_BANDS[3]
}

// ─── Effort → Fixation ───

const EFFORT_TABLE: Record<Effort, { questions: number; growthFactor: number }> = {
  1: { questions: 10, growthFactor: 3 },
  2: { questions: 12, growthFactor: 2.75 },
  3: { questions: 15, growthFactor: 2.5 },
  4: { questions: 20, growthFactor: 2.25 },
  5: { questions: 25, growthFactor: 2 },
}

export function getEffortConfig(effort: Effort) {
  return EFFORT_TABLE[effort]
}

// ─── Incidence Adjustments ───

const INCIDENCE_QUESTION_ADJUST: Record<Incidence, number> = {
  high: 5,
  medium: 0,
  low: -3,
}

const INCIDENCE_INTERVAL_CAP: Record<Incidence, number> = {
  high: 60,
  medium: 90,
  low: 120,
}

export function adjustQuestionsForIncidence(baseQuestions: number, incidence: Incidence): number {
  return Math.max(8, baseQuestions + INCIDENCE_QUESTION_ADJUST[incidence])
}

export function getIntervalCap(incidence: Incidence): number {
  return INCIDENCE_INTERVAL_CAP[incidence]
}

// ─── Calculate Fixation ───

export function calculateFixation(effort: Effort, incidence: Incidence): {
  questions: number
  growthFactor: number
} {
  const config = getEffortConfig(effort)
  return {
    questions: adjustQuestionsForIncidence(config.questions, incidence),
    growthFactor: config.growthFactor,
  }
}

// ─── Calculate Next Review ───

export function calculateNextReview(params: {
  accuracy: number
  currentInterval: number
  reviewNumber: number
  effort: Effort
  incidence: Incidence
  isAfterFixation: boolean
  examDate: string
  finalStretchStart: string
  totalLadderReviews: number
}): {
  intervalDays: number
  questions: number
  suggestSummary: boolean
} | null {
  const {
    accuracy, currentInterval, reviewNumber, effort, incidence,
    isAfterFixation, examDate, finalStretchStart, totalLadderReviews,
  } = params

  // Max 6 ladder reviews
  if (reviewNumber > 6) return null

  const band = getAccuracyBand(accuracy)
  const effortConfig = getEffortConfig(effort)
  const cap = getIntervalCap(incidence)

  let intervalDays: number

  if (isAfterFixation) {
    intervalDays = band.afterFixation.intervalDays
  } else if (band.label === 'domínio') {
    // Mastery: use effort growth factor
    intervalDays = Math.round(currentInterval * effortConfig.growthFactor)
  } else if (band.label === 'rever teoria') {
    // Reset: back to 1 day
    intervalDays = 1
  } else {
    // Good or attention: multiply current interval
    intervalDays = Math.max(
      band.afterReview.minDays,
      Math.round(currentInterval * band.afterReview.intervalMultiplier)
    )
  }

  // From 4th review onwards: spread remaining until final stretch
  if (reviewNumber >= 4) {
    const today = new Date()
    const daysUntilFinal = differenceInDays(new Date(finalStretchStart), today)
    const reviewsLeft = 6 - reviewNumber + 1
    const spreadInterval = Math.floor(daysUntilFinal / (reviewsLeft + 1))
    intervalDays = Math.max(intervalDays, spreadInterval)
  }

  // Cap by incidence (but spread can override for reviews 4-6)
  if (reviewNumber < 4) {
    intervalDays = Math.min(intervalDays, cap)
  }

  // No reviews after exam
  const nextDate = addDays(new Date(), intervalDays)
  if (nextDate > new Date(examDate)) return null

  const questions = adjustQuestionsForIncidence(band.reviewQuestions, incidence)
  const suggestSummary = band.label === 'rever teoria'

  return { intervalDays, questions, suggestSummary }
}

// ─── Category → Incidence ───

export function categoryToIncidence(category: 'essential' | 'important' | 'complementary'): Incidence {
  switch (category) {
    case 'essential': return 'high'
    case 'important': return 'medium'
    case 'complementary': return 'low'
  }
}
