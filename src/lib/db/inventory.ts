import { prisma } from './client'
import type { InventoryItem } from '@prisma/client'

export async function getInventoryItems(venueId: string, period?: string): Promise<InventoryItem[]> {
  return prisma.inventoryItem.findMany({
    where: {
      venueId,
      ...(period ? { period } : {}),
    },
    orderBy: { name: 'asc' },
  })
}

export async function createInventoryItem(data: {
  venueId: string
  period?: string
  name: string
  category: string
  unit: string
  expectedQty: number
  actualQty: number
  pricePerUnit: number
}): Promise<InventoryItem> {
  return prisma.inventoryItem.create({
    data: {
      venueId: data.venueId,
      period: data.period ?? new Date().toISOString().substring(0, 7),
      name: data.name,
      category: data.category,
      unit: data.unit,
      expectedQty: data.expectedQty,
      actualQty: data.actualQty,
      pricePerUnit: data.pricePerUnit,
    },
  })
}

export async function updateInventoryItem(
  id: string,
  data: Partial<{
    name: string
    category: string
    unit: string
    expectedQty: number
    actualQty: number
    pricePerUnit: number
    period: string
  }>
): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id },
    data,
  })
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await prisma.inventoryItem.delete({
    where: { id },
  })
}
