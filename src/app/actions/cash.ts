'use server'

import { getCashBalances, upsertCashBalance } from '@/lib/db/cash'

export async function getCashBalancesAction(venueId: string): Promise<Record<string, number>> {
  return getCashBalances(venueId)
}

export async function setCashBalanceAction(
  venueId: string,
  monthKey: string,
  amount: number
): Promise<{ success: boolean; monthKey: string; amount: number }> {
  await upsertCashBalance(venueId, monthKey, amount)
  return { success: true, monthKey, amount }
}
