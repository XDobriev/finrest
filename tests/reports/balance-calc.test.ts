import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateBalanceReportData } from '../../src/lib/reports/balance'
import type { BalanceSnapshot } from '../../src/types'

const sampleSnapshot: BalanceSnapshot = {
  id: 'snap-1',
  venueId: 'venue-1',
  monthKey: '2026-11',
  cashAmount: 1800000,
  inventoryFood: 450000,
  inventoryBar: 350000,
  accountsReceivable: 200000,
  accountsPayable: 900000,
  payrollPayable: 600000,
  taxesPayable: 150000,
  guestPrepayments: 150000,
  safetyReserveDays: 10,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
}

test('Balance Engine: calculates total assets, liabilities and NWC correctly', () => {
  const result = calculateBalanceReportData({
    snapshot: sampleSnapshot,
    monthlyOpex: 1200000,
    venueName: 'Ресторан Центр',
    period: 'Ноябрь 2026',
  })

  // Total Assets: 1800k + 450k + 350k + 200k = 2800k
  assert.equal(result.assets.totalCurrentAssets, 2800000)
  // Total Liabilities: 900k + 600k + 150k + 150k = 1800k
  assert.equal(result.liabilities.totalCurrentLiabilities, 1800000)
  // NWC: 2800k - 1800k = 1000k
  assert.equal(result.workingCapital.nwc, 1000000)
  // Current Ratio: 2800k / 1800k = 1.56
  assert.equal(Math.round(result.workingCapital.currentRatio * 100) / 100, 1.56)
  assert.equal(result.workingCapital.liquidityStatus, 'healthy')
})

test('Balance Engine: calculates safe dividends with operating reserve buffer', () => {
  // monthlyOpex = 1200k => daily = 40k. 10 reserve days buffer = 400k.
  // Cash (1800k) - Liabilities (1800k) - Buffer (400k) = -400k (Deficit!)
  const result = calculateBalanceReportData({
    snapshot: sampleSnapshot,
    monthlyOpex: 1200000,
    venueName: 'Ресторан Центр',
    period: 'Ноябрь 2026',
  })

  assert.equal(result.safeDividends.dailyOpex, 40000)
  assert.equal(result.safeDividends.safetyBuffer, 400000)
  assert.equal(result.safeDividends.isSafe, false)
  assert.equal(result.safeDividends.maxSafeDividend, 0)
  assert.equal(result.safeDividends.deficitAmount, 400000)
})

test('Balance Engine: allows dividends when free cash exceeds buffer and liabilities', () => {
  const richSnapshot: BalanceSnapshot = {
    ...sampleSnapshot,
    cashAmount: 3000000, // 3000k cash - 1800k liab - 400k buffer = 800k safe
  }
  const result = calculateBalanceReportData({
    snapshot: richSnapshot,
    monthlyOpex: 1200000,
    venueName: 'Ресторан Центр',
    period: 'Ноябрь 2026',
  })

  assert.equal(result.safeDividends.isSafe, true)
  assert.equal(result.safeDividends.maxSafeDividend, 800000)
  assert.equal(result.safeDividends.deficitAmount, 0)
})

test('Balance Engine: safely handles zero liabilities without division by zero', () => {
  const zeroLiabSnapshot: BalanceSnapshot = {
    ...sampleSnapshot,
    accountsPayable: 0,
    payrollPayable: 0,
    taxesPayable: 0,
    guestPrepayments: 0,
  }
  const result = calculateBalanceReportData({
    snapshot: zeroLiabSnapshot,
    monthlyOpex: 300000,
    venueName: 'Ресторан',
    period: 'Ноябрь 2026',
  })

  assert.equal(result.workingCapital.currentRatio, 999)
  assert.equal(result.workingCapital.liquidityStatus, 'healthy')
})
