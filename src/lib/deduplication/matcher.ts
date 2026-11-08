import type { Transaction, DeduplicationPair, DeduplicationSettings } from '@/types'
import { fuzzySimilarity } from './fuzzy-match'
import { generateId } from '@/lib/utils'

export function isAcquiringMatch(txA: Transaction, txB: Transaction): boolean {
  if (txA.type !== 'income' || txB.type !== 'income') return false
  const srcA = txA.source
  const srcB = txB.source
  const cpA = txA.counterparty.toLowerCase()
  const cpB = txB.counterparty.toLowerCase()

  const isIikoA = srcA === 'iiko' || cpA.includes('iiko') || cpA.includes('касса')
  const isIikoB = srcB === 'iiko' || cpB.includes('iiko') || cpB.includes('касса')

  const isAcqA =
    srcA === 'bank' ||
    cpA.includes('эквайринг') ||
    cpA.includes('терминал') ||
    cpA.includes('банк')
  const isAcqB =
    srcB === 'bank' ||
    cpB.includes('эквайринг') ||
    cpB.includes('терминал') ||
    cpB.includes('банк')

  return (isIikoA && isAcqB) || (isIikoB && isAcqA)
}

export function calculateMatchScore(
  txA: Transaction,
  txB: Transaction,
  settings: DeduplicationSettings,
  precomputedDateDiffDays?: number
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Date comparison (±tolerance days)
  const dateDiffDays =
    precomputedDateDiffDays !== undefined
      ? precomputedDateDiffDays
      : Math.abs(new Date(txA.date).getTime() - new Date(txB.date).getTime()) /
        (1000 * 60 * 60 * 24)

  if (dateDiffDays === 0) {
    score += 35
    reasons.push('Дата совпадает')
  } else if (dateDiffDays <= settings.dateToleranceDays) {
    score += Math.round(35 * (1 - dateDiffDays / settings.dateToleranceDays))
    reasons.push(`Дата похожа (±${Math.round(dateDiffDays)} дн.)`)
  }

  // Amount comparison (±tolerance percent)
  const maxAmount = Math.max(txA.amount, txB.amount)
  const amountDiff = maxAmount > 0 ? Math.abs(txA.amount - txB.amount) / maxAmount : 0
  if (amountDiff === 0) {
    score += 35
    reasons.push('Сумма совпадает')
  } else if (amountDiff <= settings.amountTolerancePercent / 100) {
    score += Math.round(35 * (1 - amountDiff / (settings.amountTolerancePercent / 100)))
    reasons.push('Сумма похожа')
  }

  // Counterparty: check acquiring revenue pattern or fuzzy match
  if (isAcquiringMatch(txA, txB)) {
    score += 30
    reasons.push('Выручка iiko и выплата эквайринга')
  } else {
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
  }

  return { score: Math.min(score, 99), reasons }
}

export function findDuplicates(
  transactions: Transaction[],
  venueId: string,
  settings: DeduplicationSettings
): DeduplicationPair[] {
  // Support both expense and income deduplication (e.g. iiko shift sales vs bank acquiring payout)
  const venueCandidates = transactions.filter(
    (t) => t.venueId === venueId && t.status !== 'duplicate'
  )

  if (venueCandidates.length < 2) return []

  // Pre-parse timestamp for fast date comparisons
  const parsed = venueCandidates.map((t) => ({
    tx: t,
    timestamp: new Date(t.date).getTime(),
  }))

  // Partition by type (income cannot match expense)
  const incomeTxs = parsed.filter((p) => p.tx.type === 'income')
  const expenseTxs = parsed.filter((p) => p.tx.type === 'expense')

  // Chronological sort: O(N log N)
  incomeTxs.sort((a, b) => a.timestamp - b.timestamp)
  expenseTxs.sort((a, b) => a.timestamp - b.timestamp)

  const pairs: DeduplicationPair[] = []
  const maxToleranceDays = settings.dateToleranceDays
  const msInDay = 1000 * 60 * 60 * 24
  const tolRatio = settings.amountTolerancePercent / 100

  function scanPartition(partition: typeof parsed) {
    const len = partition.length
    for (let i = 0; i < len; i++) {
      const itemA = partition[i]
      const txA = itemA.tx
      const timeA = itemA.timestamp

      // Sliding window scan: only examine candidates within dateToleranceDays
      for (let j = i + 1; j < len; j++) {
        const itemB = partition[j]
        const txB = itemB.tx
        const timeB = itemB.timestamp

        const dateDiffDays = (timeB - timeA) / msInDay
        if (dateDiffDays > maxToleranceDays) {
          // Since array is sorted by date, all remaining items will have dateDiff > maxToleranceDays
          break
        }

        // Fast amount diff check
        const maxAmt = Math.max(txA.amount, txB.amount)
        const amtDiff = maxAmt > 0 ? Math.abs(txA.amount - txB.amount) / maxAmt : 0
        const isAcq = isAcquiringMatch(txA, txB)

        // If amount diff is beyond tolerance and it's not an acquiring match, skip
        if (amtDiff > tolRatio && !isAcq) {
          continue
        }

        const { score, reasons } = calculateMatchScore(
          txA,
          txB,
          settings,
          Math.round(dateDiffDays)
        )

        if (score >= 58 && reasons.length >= 2) {
          pairs.push({
            id: generateId(),
            venueId,
            leftTransaction: txA,
            rightTransaction: txB,
            matchScore: score,
            matchReasons: reasons,
            status: 'pending',
          })
        }
      }
    }
  }

  scanPartition(incomeTxs)
  scanPartition(expenseTxs)

  return pairs.sort((a, b) => b.matchScore - a.matchScore)
}
