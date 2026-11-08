'use server'

import { revalidatePath } from 'next/cache'
import { getBalanceSnapshot, upsertBalanceSnapshot } from '@/lib/db/balance'
import type { BalanceSnapshot, UpsertBalanceInput } from '@/types'

export async function getBalanceSnapshotAction(venueId: string, monthKey: string): Promise<BalanceSnapshot> {
  try {
    return await getBalanceSnapshot(venueId, monthKey)
  } catch (error) {
    console.error('Error in getBalanceSnapshotAction:', error)
    throw new Error('Не удалось загрузить снимок баланса')
  }
}

export async function saveBalanceSnapshotAction(input: UpsertBalanceInput): Promise<{ success: boolean; data?: BalanceSnapshot; error?: string }> {
  try {
    const data = await upsertBalanceSnapshot(input)
    revalidatePath('/reports')
    return { success: true, data }
  } catch (error) {
    console.error('Error in saveBalanceSnapshotAction:', error)
    return { success: false, error: 'Не удалось сохранить снимок баланса' }
  }
}
