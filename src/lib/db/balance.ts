import { prisma } from './client'
import type { BalanceSnapshot, UpsertBalanceInput } from '@/types'
import { getCashBalance } from './cash'
import { getTransactions } from './transactions'
import { getInventoryItems } from './inventory'

export async function getBalanceSnapshot(venueId: string, monthKey: string): Promise<BalanceSnapshot> {
  // Check if an explicit snapshot was already persisted
  const existing = await prisma.balanceSnapshot.findUnique({
    where: {
      venueId_monthKey: { venueId, monthKey },
    },
  })

  if (existing) {
    return {
      id: existing.id,
      venueId: existing.venueId,
      monthKey: existing.monthKey,
      cashAmount: existing.cashAmount,
      inventoryFood: existing.inventoryFood,
      inventoryBar: existing.inventoryBar,
      accountsReceivable: existing.accountsReceivable,
      accountsPayable: existing.accountsPayable,
      payrollPayable: existing.payrollPayable,
      taxesPayable: existing.taxesPayable,
      guestPrepayments: existing.guestPrepayments,
      safetyReserveDays: existing.safetyReserveDays,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
    }
  }

  // Otherwise calculate defaults from DDS and Inventory
  // 1. Cash amount: opening balance + net cash flow
  const openingBalance = await getCashBalance(venueId, monthKey)
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const fromDate = `${monthKey}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const toDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`

  const txs = await getTransactions(venueId, { from: fromDate, to: toDate })
  let netCashFlow = 0
  for (const tx of txs) {
    if (tx.status === 'duplicate') continue
    if (tx.type === 'income') {
      netCashFlow += tx.amount
    } else {
      netCashFlow -= tx.amount
    }
  }
  const defaultCash = Math.max(0, Math.round((openingBalance + netCashFlow) * 100) / 100)

  // 2. Inventory items for monthKey
  const inventoryItems = await getInventoryItems(venueId, monthKey)
  let foodTotal = 0
  let barTotal = 0
  for (const item of inventoryItems) {
    const cost = item.actualQty * item.pricePerUnit
    if (item.category === 'bar') {
      barTotal += cost
    } else {
      foodTotal += cost
    }
  }

  return {
    id: `temp-${venueId}-${monthKey}`,
    venueId,
    monthKey,
    cashAmount: defaultCash,
    inventoryFood: Math.round(foodTotal),
    inventoryBar: Math.round(barTotal),
    accountsReceivable: 0,
    accountsPayable: 0,
    payrollPayable: 0,
    taxesPayable: 0,
    guestPrepayments: 0,
    safetyReserveDays: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function upsertBalanceSnapshot(input: UpsertBalanceInput): Promise<BalanceSnapshot> {
  const result = await prisma.balanceSnapshot.upsert({
    where: {
      venueId_monthKey: { venueId: input.venueId, monthKey: input.monthKey },
    },
    update: {
      cashAmount: input.cashAmount,
      inventoryFood: input.inventoryFood,
      inventoryBar: input.inventoryBar,
      accountsReceivable: input.accountsReceivable,
      accountsPayable: input.accountsPayable,
      payrollPayable: input.payrollPayable,
      taxesPayable: input.taxesPayable,
      guestPrepayments: input.guestPrepayments,
      safetyReserveDays: input.safetyReserveDays ?? 10,
    },
    create: {
      venueId: input.venueId,
      monthKey: input.monthKey,
      cashAmount: input.cashAmount,
      inventoryFood: input.inventoryFood,
      inventoryBar: input.inventoryBar,
      accountsReceivable: input.accountsReceivable,
      accountsPayable: input.accountsPayable,
      payrollPayable: input.payrollPayable,
      taxesPayable: input.taxesPayable,
      guestPrepayments: input.guestPrepayments,
      safetyReserveDays: input.safetyReserveDays ?? 10,
    },
  })

  return {
    id: result.id,
    venueId: result.venueId,
    monthKey: result.monthKey,
    cashAmount: result.cashAmount,
    inventoryFood: result.inventoryFood,
    inventoryBar: result.inventoryBar,
    accountsReceivable: result.accountsReceivable,
    accountsPayable: result.accountsPayable,
    payrollPayable: result.payrollPayable,
    taxesPayable: result.taxesPayable,
    guestPrepayments: result.guestPrepayments,
    safetyReserveDays: result.safetyReserveDays,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }
}
