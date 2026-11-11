import { addDays, format, differenceInDays } from 'date-fns'
import { createAgendaItem } from '../db/agenda'
import { DEFAULT_USER_ID } from '../supabase'
import { getIntervalCap, adjustQuestionsForIncidence, getEffortConfig } from './review-engine'
import type { Effort, Incidence } from '../types'

const EXAM_DATE = '2027-12-19'
const FINAL_STRETCH_START = '2027-11-07'

/**
 * Schedule R1-R6 reviews for a subject after fixation.
 * Assumes "bom" accuracy (70-84%) for initial projection.
 * Reviews recalculate when each one is actually completed.
 */
export async function scheduleInitialReviews(params: {
  subjectId: string
  effort: Effort
  incidence: Incidence
  fixationDate: string // yyyy-MM-dd
}): Promise<void> {
  const { subjectId, effort, incidence, fixationDate } = params
  const effortConfig = getEffortConfig(effort)
  const cap = getIntervalCap(incidence)

  let currentDate = new Date(fixationDate + 'T12:00:00')
  let currentInterval = 4 // "bom" after fixation = 4 days

  for (let r = 1; r <= 6; r++) {
    const nextDate = addDays(currentDate, currentInterval)

    // Don't schedule past exam
    if (nextDate > new Date(EXAM_DATE)) break

    // From 4th review: spread remaining until final stretch
    if (r >= 4) {
      const daysUntilFinal = differenceInDays(new Date(FINAL_STRETCH_START), nextDate)
      const reviewsLeft = 6 - r + 1
      const spreadInterval = Math.floor(daysUntilFinal / (reviewsLeft + 1))
      if (spreadInterval > currentInterval) {
        currentInterval = spreadInterval
      }
    }

    const plannedDate = format(addDays(currentDate, currentInterval), 'yyyy-MM-dd')
    const questions = r <= 3 ? adjustQuestionsForIncidence(10, incidence) : 10

    await createAgendaItem({
      type: 'review',
      review_number: r,
      planned_date: plannedDate,
      done_date: null,
      status: 'planned',
      planned_questions: questions,
      done_questions: null,
      correct_questions: null,
      interval_used: currentInterval,
      subject_id: subjectId,
      simulado_id: null,
      user_id: DEFAULT_USER_ID,
    })

    currentDate = addDays(currentDate, currentInterval)
    // Grow interval for next review (assuming "bom")
    currentInterval = Math.min(Math.round(currentInterval * 1.5), cap)
  }

  // Schedule guaranteed review (RF) in final stretch
  // Pick a date roughly in the middle of the final stretch
  const rfDate = format(addDays(new Date(FINAL_STRETCH_START), 14), 'yyyy-MM-dd')
  if (new Date(rfDate) < new Date(EXAM_DATE)) {
    await createAgendaItem({
      type: 'guaranteed_review',
      review_number: null,
      planned_date: rfDate,
      done_date: null,
      status: 'planned',
      planned_questions: 10,
      done_questions: null,
      correct_questions: null,
      interval_used: null,
      subject_id: subjectId,
      simulado_id: null,
      user_id: DEFAULT_USER_ID,
    })
  }
}

/**
 * Schedule the NEXT review after completing one.
 * Uses actual accuracy to determine interval.
 */
export async function scheduleNextReview(params: {
  subjectId: string
  completedReviewNumber: number
  accuracy: number // 0-100
  effort: Effort
  incidence: Incidence
  previousInterval: number
  completedDate: string // yyyy-MM-dd
}): Promise<{ nextDate: string; nextQuestions: number; nextReviewNumber: number } | null> {
  const { subjectId, completedReviewNumber, accuracy, effort, incidence, previousInterval, completedDate } = params

  const nextReviewNumber = completedReviewNumber + 1
  if (nextReviewNumber > 6) return null // max 6 ladder reviews

  const effortConfig = getEffortConfig(effort)
  const cap = getIntervalCap(incidence)
  let intervalDays: number
  let questions: number

  if (accuracy >= 85) {
    // Mastery: use effort growth factor
    intervalDays = Math.round(previousInterval * effortConfig.growthFactor)
    questions = adjustQuestionsForIncidence(10, incidence)
  } else if (accuracy >= 70) {
    // Good: interval * 1.5
    intervalDays = Math.round(previousInterval * 1.5)
    questions = adjustQuestionsForIncidence(10, incidence)
  } else if (accuracy >= 50) {
    // Attention: interval / 2
    intervalDays = Math.max(2, Math.round(previousInterval * 0.5))
    questions = adjustQuestionsForIncidence(15, incidence)
  } else {
    // Review theory: reset
    intervalDays = 1
    questions = adjustQuestionsForIncidence(20, incidence)
  }

  // From 4th review: spread remaining until final stretch
  if (nextReviewNumber >= 4) {
    const daysUntilFinal = differenceInDays(new Date(FINAL_STRETCH_START), new Date(completedDate))
    const reviewsLeft = 6 - nextReviewNumber + 1
    const spreadInterval = Math.floor(daysUntilFinal / (reviewsLeft + 1))
    if (spreadInterval > intervalDays) {
      intervalDays = spreadInterval
    }
  }

  // Cap by incidence (reviews 1-3 only)
  if (nextReviewNumber < 4) {
    intervalDays = Math.min(intervalDays, cap)
  }

  const nextDate = format(addDays(new Date(completedDate + 'T12:00:00'), intervalDays), 'yyyy-MM-dd')

  // Don't schedule past exam
  if (new Date(nextDate) > new Date(EXAM_DATE)) return null

  await createAgendaItem({
    type: 'review',
    review_number: nextReviewNumber,
    planned_date: nextDate,
    done_date: null,
    status: 'planned',
    planned_questions: questions,
    done_questions: null,
    correct_questions: null,
    interval_used: intervalDays,
    subject_id: subjectId,
    simulado_id: null,
    user_id: DEFAULT_USER_ID,
  })

  return { nextDate, nextQuestions: questions, nextReviewNumber }
}
