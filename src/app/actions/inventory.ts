'use server'

import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '@/lib/db/inventory'
import type { InventoryItem, ExpenseCategory } from '@/types'

export async function getInventoryItemsAction(
  venueId: string,
  period?: string
): Promise<InventoryItem[]> {
  const items = await getInventoryItems(venueId, period)
  return items.map((item) => ({
    id: item.id,
    venueId: item.venueId,
    period: item.period,
    name: item.name,
    category: item.category as ExpenseCategory,
    unit: item.unit,
    expectedQty: item.expectedQty,
    actualQty: item.actualQty,
    pricePerUnit: item.pricePerUnit,
    createdAt: item.createdAt.toISOString(),
  }))
}

export async function createInventoryItemAction(data: {
  venueId: string
  period?: string
  name: string
  category: ExpenseCategory
  unit: string
  expectedQty: number
  actualQty: number
  pricePerUnit: number
}): Promise<InventoryItem> {
  const item = await createInventoryItem(data)
  return {
    id: item.id,
    venueId: item.venueId,
    period: item.period,
    name: item.name,
    category: item.category as ExpenseCategory,
    unit: item.unit,
    expectedQty: item.expectedQty,
    actualQty: item.actualQty,
    pricePerUnit: item.pricePerUnit,
    createdAt: item.createdAt.toISOString(),
  }
}

export async function updateInventoryItemAction(
  id: string,
  data: Partial<{
    name: string
    category: ExpenseCategory
    unit: string
    expectedQty: number
    actualQty: number
    pricePerUnit: number
    period: string
  }>
): Promise<InventoryItem> {
  const item = await updateInventoryItem(id, data)
  return {
    id: item.id,
    venueId: item.venueId,
    period: item.period,
    name: item.name,
    category: item.category as ExpenseCategory,
    unit: item.unit,
    expectedQty: item.expectedQty,
    actualQty: item.actualQty,
    pricePerUnit: item.pricePerUnit,
    createdAt: item.createdAt.toISOString(),
  }
}

export async function deleteInventoryItemAction(id: string): Promise<{ success: boolean }> {
  await deleteInventoryItem(id)
  return { success: true }
}
