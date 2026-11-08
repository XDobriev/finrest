import test from 'node:test'
import assert from 'node:assert/strict'
import { findDuplicates } from '../../src/lib/deduplication/matcher'
import { generateSyntheticTransactions } from '../../scripts/generate-synthetic-data'
import type { DeduplicationSettings } from '../../src/types'

const settings: DeduplicationSettings = {
  dateToleranceDays: 3,
  amountTolerancePercent: 5,
  fuzzyMatchThreshold: 0.7,
}

test('Deduplication Stress: accurately identifies ground truth duplicates in HoReCa dataset', () => {
  const count = 300
  const venueId = 'venue-bench'
  const { transactions, groundTruthPairs } = generateSyntheticTransactions(count, venueId, {
    duplicateRate: 0.1,
    daysSpan: 30,
    seed: 42,
  })

  const detected = findDuplicates(transactions, venueId, settings)

  // Verify that ground-truth duplicates are captured
  let matchedGroundTruth = 0
  for (const [id1, id2] of groundTruthPairs) {
    const found = detected.some(
      (pair) =>
        (pair.leftTransaction.id === id1 && pair.rightTransaction.id === id2) ||
        (pair.leftTransaction.id === id2 && pair.rightTransaction.id === id1)
    )
    if (found) matchedGroundTruth++
  }

  const recall = matchedGroundTruth / groundTruthPairs.length
  // We expect high recall (>85%) on injected duplicates
  assert.ok(
    recall >= 0.85,
    `Recall should be >= 85%, got ${(recall * 100).toFixed(1)}% (${matchedGroundTruth}/${groundTruthPairs.length})`
  )
})

test('Deduplication Stress: performance benchmark on 1,000 transactions (< 250ms)', () => {
  const count = 1000
  const venueId = 'venue-bench-1000'
  const { transactions } = generateSyntheticTransactions(count, venueId, {
    duplicateRate: 0.05,
    daysSpan: 60,
    seed: 99,
  })

  const start = performance.now()
  const detected = findDuplicates(transactions, venueId, settings)
  const durationMs = performance.now() - start

  assert.ok(Array.isArray(detected))
  // Latency target: under 250ms for 1000 transactions
  assert.ok(
    durationMs < 250,
    `1,000 transactions should process in < 250ms, took ${durationMs.toFixed(1)}ms`
  )
})

test('Deduplication Stress: high throughput on 3,000 transactions (< 800ms)', () => {
  const count = 3000
  const venueId = 'venue-bench-3000'
  const { transactions } = generateSyntheticTransactions(count, venueId, {
    duplicateRate: 0.05,
    daysSpan: 120,
    seed: 777,
  })

  const start = performance.now()
  const detected = findDuplicates(transactions, venueId, settings)
  const durationMs = performance.now() - start

  assert.ok(Array.isArray(detected))
  assert.ok(
    durationMs < 800,
    `3,000 transactions should process in < 800ms, took ${durationMs.toFixed(1)}ms`
  )
})

test('Deduplication Stress: extreme scale on 10,000 transactions (< 2,000ms)', () => {
  const count = 10000
  const venueId = 'venue-bench-10000'
  const { transactions } = generateSyntheticTransactions(count, venueId, {
    duplicateRate: 0.05,
    daysSpan: 365,
    seed: 1234,
  })

  const start = performance.now()
  const detected = findDuplicates(transactions, venueId, settings)
  const durationMs = performance.now() - start

  assert.ok(Array.isArray(detected))
  assert.ok(
    durationMs < 2000,
    `10,000 transactions should process in < 2,000ms, took ${durationMs.toFixed(1)}ms`
  )
})

