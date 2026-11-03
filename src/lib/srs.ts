import { addDays } from 'date-fns'

interface SRSResult {
  nextReviewDate: Date
  newStability: number
  newDifficulty: number
  newInterval: number
}

/**
 * FSRS-inspired algorithm adapted for subject mastery (not individual cards).
 * Uses question accuracy (0-100%) instead of card ratings.
 */
export function calculateNextReview(
  accuracy: number,
  currentStability: number,
  currentDifficulty: number,
  currentInterval: number
): SRSResult {
  const today = new Date()
  let newStability = currentStability
  let newDifficulty = currentDifficulty
  let newInterval: number

  if (accuracy >= 80) {
    // Well mastered — interval grows significantly
    const easeFactor = 1 + (accuracy - 80) / 40 // 1.0 to 1.5
    newInterval = Math.round(currentInterval * (1.8 + easeFactor * 0.5))
    newStability = Math.min(currentStability * 1.3, 10)
    newDifficulty = Math.max(currentDifficulty - 0.3, 1)
  } else if (accuracy >= 65) {
    // Moderate — interval grows moderately
    const factor = 1 + (accuracy - 65) / 30 // 1.0 to 1.5
    newInterval = Math.round(currentInterval * (1.2 + factor * 0.3))
    newStability = Math.min(currentStability * 1.1, 10)
    newDifficulty = currentDifficulty
  } else if (accuracy >= 50) {
    // Struggling — interval stays same or shrinks
    const factor = (accuracy - 50) / 15 // 0.0 to 1.0
    newInterval = Math.max(Math.round(currentInterval * (0.7 + factor * 0.3)), 1)
    newStability = Math.max(currentStability * 0.9, 0.5)
    newDifficulty = Math.min(currentDifficulty + 0.3, 10)
  } else {
    // Failed — reset to short interval
    newInterval = accuracy >= 30 ? 2 : 1
    newStability = Math.max(currentStability * 0.5, 0.5)
    newDifficulty = Math.min(currentDifficulty + 0.8, 10)
  }

  // Cap interval at 90 days
  newInterval = Math.min(newInterval, 90)

  return {
    nextReviewDate: addDays(today, newInterval),
    newStability,
    newDifficulty,
    newInterval,
  }
}

/**
 * Determine trend based on last N accuracy readings.
 * Uses simple linear regression slope.
 */
export function determineTrend(
  recentAccuracies: number[]
): 'improving' | 'stable' | 'declining' {
  if (recentAccuracies.length < 2) return 'stable'

  const last = recentAccuracies.slice(-5)
  const n = last.length

  // Simple linear regression slope
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += last[i]
    sumXY += i * last[i]
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  if (slope > 2) return 'improving'
  if (slope < -2) return 'declining'
  return 'stable'
}

/**
 * Calculate priority score for review scheduling.
 * Lower accuracy + higher difficulty = higher priority (lower number = more urgent).
 */
export function calculateReviewPriority(
  accuracy: number,
  difficulty: number,
  daysOverdue: number
): number {
  const accuracyWeight = (100 - accuracy) * 2
  const difficultyWeight = difficulty * 10
  const overdueWeight = daysOverdue * 15

  return accuracyWeight + difficultyWeight + overdueWeight
}
