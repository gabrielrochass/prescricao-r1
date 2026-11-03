import { addDays, format } from 'date-fns'
import type { ReviewQueueItem } from './types'

interface RedistributedPlan {
  date: string
  reviews: ReviewQueueItem[]
  totalQuestions: number
}

/**
 * Anti-snowball: redistributes overdue reviews across upcoming days.
 * Prioritizes lowest accuracy first. Respects daily limit.
 * If all reviews can't fit, extends the timeline.
 */
export function redistributeOverdue(
  overdueReviews: ReviewQueueItem[],
  dailyLimit: number,
  availableDays: number
): RedistributedPlan[] {
  if (overdueReviews.length === 0) return []

  // Sort by priority: lowest accuracy first (most urgent)
  const sorted = [...overdueReviews].sort((a, b) => {
    const accA = a.last_accuracy ?? 0
    const accB = b.last_accuracy ?? 0
    return accA - accB
  })

  // Calculate how many days we actually need
  const reviewsPerDay = Math.min(dailyLimit, 5) // max 5 review topics per day
  const daysNeeded = Math.ceil(sorted.length / reviewsPerDay)
  const totalDays = Math.max(availableDays, daysNeeded)

  const plan: RedistributedPlan[] = []
  const today = new Date()
  let reviewIndex = 0

  for (let day = 0; day < totalDays && reviewIndex < sorted.length; day++) {
    const date = format(addDays(today, day + 1), 'yyyy-MM-dd')
    const dayReviews: ReviewQueueItem[] = []

    for (let i = 0; i < reviewsPerDay && reviewIndex < sorted.length; i++) {
      dayReviews.push(sorted[reviewIndex])
      reviewIndex++
    }

    if (dayReviews.length > 0) {
      plan.push({
        date,
        reviews: dayReviews,
        totalQuestions: dayReviews.length * 10, // ~10 questions per review topic
      })
    }
  }

  return plan
}

/**
 * Check if snowball is forming (too many overdue reviews).
 * Returns severity level.
 */
export function checkSnowballRisk(
  pendingReviews: number,
  dailyLimit: number
): 'none' | 'mild' | 'moderate' | 'severe' {
  const ratio = pendingReviews / Math.max(dailyLimit, 1)

  if (ratio <= 1) return 'none'
  if (ratio <= 2) return 'mild'
  if (ratio <= 4) return 'moderate'
  return 'severe'
}

/**
 * Generate motivational message based on snowball severity.
 */
export function getSnowballMessage(severity: 'none' | 'mild' | 'moderate' | 'severe'): string {
  switch (severity) {
    case 'none':
      return 'Revisões em dia! Continue assim.'
    case 'mild':
      return 'Algumas revisões acumularam. Vamos colocar em dia?'
    case 'moderate':
      return 'Revisões se acumulando! Redistribuí nos próximos dias pra não virar bola de neve.'
    case 'severe':
      return 'Muitas revisões pendentes! Priorizei as mais urgentes pra recuperar o ritmo.'
  }
}
