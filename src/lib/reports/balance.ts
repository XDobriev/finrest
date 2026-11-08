import type { BalanceSnapshot, BalanceReportData, LiquidityStatus } from '@/types'

export interface CalculateBalanceParams {
  snapshot: BalanceSnapshot
  monthlyOpex: number
  venueName: string
  period: string
}

export function calculateBalanceReportData({
  snapshot,
  monthlyOpex,
  venueName,
  period,
}: CalculateBalanceParams): BalanceReportData {
  const totalCurrentAssets =
    (snapshot.cashAmount || 0) +
    (snapshot.inventoryFood || 0) +
    (snapshot.inventoryBar || 0) +
    (snapshot.accountsReceivable || 0)

  const totalCurrentLiabilities =
    (snapshot.accountsPayable || 0) +
    (snapshot.payrollPayable || 0) +
    (snapshot.taxesPayable || 0) +
    (snapshot.guestPrepayments || 0)

  const nwc = totalCurrentAssets - totalCurrentLiabilities

  let currentRatio: number
  let liquidityStatus: LiquidityStatus
  let liquidityLabel: string

  if (totalCurrentLiabilities === 0) {
    currentRatio = 999
    liquidityStatus = 'healthy'
    liquidityLabel = 'Обязательства отсутствуют'
  } else {
    currentRatio = Math.round((totalCurrentAssets / totalCurrentLiabilities) * 100) / 100
    if (currentRatio >= 1.0) {
      liquidityStatus = 'healthy'
      liquidityLabel = 'Высокая устойчивость'
    } else if (currentRatio >= 0.7) {
      liquidityStatus = 'warning'
      liquidityLabel = 'Умеренный риск (норма HoReCa)'
    } else {
      liquidityStatus = 'critical'
      liquidityLabel = 'Критический риск разрыва'
    }
  }

  const safeDays = Math.max(1, snapshot.safetyReserveDays || 10)
  const dailyOpex = Math.round((Math.max(0, monthlyOpex) / 30) * 100) / 100
  const safetyBuffer = Math.round(dailyOpex * safeDays)

  const netCashSurplus = (snapshot.cashAmount || 0) - totalCurrentLiabilities - safetyBuffer
  const isSafe = netCashSurplus > 0
  const maxSafeDividend = isSafe ? Math.round(netCashSurplus) : 0
  const deficitAmount = isSafe ? 0 : Math.round(Math.abs(netCashSurplus))

  return {
    venueName,
    monthKey: snapshot.monthKey,
    period,
    assets: {
      cashAmount: snapshot.cashAmount || 0,
      inventoryFood: snapshot.inventoryFood || 0,
      inventoryBar: snapshot.inventoryBar || 0,
      accountsReceivable: snapshot.accountsReceivable || 0,
      totalCurrentAssets,
    },
    liabilities: {
      accountsPayable: snapshot.accountsPayable || 0,
      payrollPayable: snapshot.payrollPayable || 0,
      taxesPayable: snapshot.taxesPayable || 0,
      guestPrepayments: snapshot.guestPrepayments || 0,
      totalCurrentLiabilities,
    },
    workingCapital: {
      nwc,
      currentRatio,
      liquidityStatus,
      liquidityLabel,
    },
    safeDividends: {
      dailyOpex,
      safetyReserveDays: safeDays,
      safetyBuffer,
      maxSafeDividend,
      isSafe,
      deficitAmount,
    },
  }
}
