import type { Transaction, DeduplicationPair, DeduplicationSettings } from '@/types'
import { fuzzySimilarity } from './fuzzy-match'
import { generateId } from '@/lib/utils'

function calculateMatchScore(
  txA: Transaction,
  txB: Transaction,
  settings: DeduplicationSettings
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Date comparison (±tolerance days)
  const dateA = new Date(txA.date)
  const dateB = new Date(txB.date)
  const dateDiffDays = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24)

  if (dateDiffDays === 0) {
    score += 35
    reasons.push('Дата совпадает')
  } else if (dateDiffDays <= settings.dateToleranceDays) {
    score += Math.round(35 * (1 - dateDiffDays / settings.dateToleranceDays))
    reasons.push(`Дата похожа (±${dateDiffDays} дн.)`)
  }

  // Amount comparison (±tolerance percent)
  const amountDiff = Math.abs(txA.amount - txB.amount) / Math.max(txA.amount, txB.amount)
  if (amountDiff === 0) {
    score += 35
    reasons.push('Сумма совпадает')
  } else if (amountDiff <= settings.amountTolerancePercent / 100) {
    score += Math.round(35 * (1 - amountDiff / (settings.amountTolerancePercent / 100)))
    reasons.push('Сумма похожа')
  }

  // Counterparty fuzzy match
  const similarity = fuzzySimilarity(txA.counterparty, txB.counterparty)
  if (similarity >= settings.fuzzyMatchThreshold) {
    const counterpartyScore = Math.round(similarity * 30)
    score += counterpartyScore
    if (similarity >= 0.9) {
      reasons.push('Контрагент совпадает')
    } else {
      reasons.push('Контрагент похож')
    }
  }

  return { score: Math.min(score, 99), reasons }
}

export function findDuplicates(
  transactions: Transaction[],
  venueId: string,
  settings: DeduplicationSettings
): DeduplicationPair[] {
  const venueExpenses = transactions.filter(
    (t) =>
      t.venueId === venueId &&
      t.type === 'expense' &&
      t.status !== 'duplicate'
  )

  const pairs: DeduplicationPair[] = []

  for (let i = 0; i < venueExpenses.length; i++) {
    for (let j = i + 1; j < venueExpenses.length; j++) {
      const a = venueExpenses[i]
      const b = venueExpenses[j]

      // Don't match from same source (it would be a real duplicate within one source)
      // Actually we do want to match across sources — that's the point

      const { score, reasons } = calculateMatchScore(a, b, settings)

      if (score >= 60 && reasons.length >= 2) {
        pairs.push({
          id: generateId(),
          venueId,
          leftTransaction: a,
          rightTransaction: b,
          matchScore: score,
          matchReasons: reasons,
          status: 'pending',
        })
      }
    }
  }

  return pairs.sort((a, b) => b.matchScore - a.matchScore)
}
