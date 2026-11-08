'use server'

import { prisma } from '@/lib/db/client'
import { analyzeMenu } from '@/lib/food-cost/engine'
import type {
  MenuItemInput,
  AnalyzedMenuItem,
  MenuEngineeringSummary,
} from '@/lib/food-cost/types'

export interface MenuAnalysisResult {
  items: AnalyzedMenuItem[]
  summary: MenuEngineeringSummary
}

import { getCurrentUserAction } from './auth'

async function verifyVenueAccess(venueId: string): Promise<boolean> {
  const user = await getCurrentUserAction()
  if (!user?.userId) return true
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true },
  })
  if (!venue) return false
  if (venue.ownerId && venue.ownerId !== user.userId) {
    return false
  }
  return true
}

export async function getMenuItemsAction(
  venueId: string,
  period = '2026-11'
): Promise<MenuItemInput[]> {
  const hasAccess = await verifyVenueAccess(venueId)
  if (!hasAccess) {
    return []
  }

  const items = await prisma.menuItem.findMany({
    where: { venueId, period },
    orderBy: { salesVolume: 'desc' },
  })

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    sellingPrice: i.sellingPrice,
    standardCost: i.standardCost,
    actualCost: i.actualCost,
    salesVolume: i.salesVolume,
    period: i.period,
  }))
}

export async function saveMenuItemAction(
  venueId: string,
  input: MenuItemInput
): Promise<MenuItemInput> {
  const hasAccess = await verifyVenueAccess(venueId)
  if (!hasAccess) {
    throw new Error('Нет прав на управление меню этого заведения')
  }

  const period = input.period || '2026-11'

  let record
  if (input.id) {
    record = await prisma.menuItem.update({
      where: { id: input.id },
      data: {
        name: input.name,
        category: input.category,
        sellingPrice: input.sellingPrice,
        standardCost: input.standardCost,
        actualCost: input.actualCost,
        salesVolume: input.salesVolume,
        period,
      },
    })
  } else {
    record = await prisma.menuItem.create({
      data: {
        venueId,
        name: input.name,
        category: input.category,
        sellingPrice: input.sellingPrice,
        standardCost: input.standardCost,
        actualCost: input.actualCost,
        salesVolume: input.salesVolume,
        period,
      },
    })
  }

  return {
    id: record.id,
    name: record.name,
    category: record.category,
    sellingPrice: record.sellingPrice,
    standardCost: record.standardCost,
    actualCost: record.actualCost,
    salesVolume: record.salesVolume,
    period: record.period,
  }
}

export async function deleteMenuItemAction(itemId: string): Promise<{ success: boolean }> {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { venueId: true },
  })
  if (!item) return { success: true }

  const hasAccess = await verifyVenueAccess(item.venueId)
  if (!hasAccess) {
    throw new Error('Нет прав на удаление блюда этого заведения')
  }

  await prisma.menuItem.delete({ where: { id: itemId } })
  return { success: true }
}

export async function getMenuAnalysisAction(
  venueId: string,
  period = '2026-11'
): Promise<MenuAnalysisResult> {
  const hasAccess = await verifyVenueAccess(venueId)
  if (!hasAccess) {
    return analyzeMenu([])
  }

  let items = await getMenuItemsAction(venueId, period)

  if (items.length === 0) {
    items = await seedDefaultMenuAction(venueId, period)
  }

  return analyzeMenu(items)
}

export async function seedDefaultMenuAction(
  venueId: string,
  period = '2026-11'
): Promise<MenuItemInput[]> {
  const hasAccess = await verifyVenueAccess(venueId)
  if (!hasAccess) {
    throw new Error('Нет прав на управление меню этого заведения')
  }
  const defaultItems = [
    {
      name: 'Стейк Рибай Прайм',
      category: 'kitchen',
      sellingPrice: 2800,
      standardCost: 840,
      actualCost: 1120, // +10% over-portioning variance
      salesVolume: 240,
    },
    {
      name: 'Борщ с говядиной и пампушками',
      category: 'kitchen',
      sellingPrice: 550,
      standardCost: 165,
      actualCost: 175,
      salesVolume: 680, // High demand, low margin -> Plowhorse
    },
    {
      name: 'Трюфельное ризотто с белыми грибами',
      category: 'kitchen',
      sellingPrice: 1450,
      standardCost: 360,
      actualCost: 375,
      salesVolume: 48, // Low demand, high margin -> Puzzle
    },
    {
      name: 'Овсяная каша на воде с ягодами',
      category: 'kitchen',
      sellingPrice: 320,
      standardCost: 140,
      actualCost: 150,
      salesVolume: 28, // Dog
    },
    {
      name: 'Цезарь с тигровыми креветками',
      category: 'kitchen',
      sellingPrice: 890,
      standardCost: 260,
      actualCost: 270,
      salesVolume: 420, // Star
    },
    {
      name: 'Паста Карбонара Классико',
      category: 'kitchen',
      sellingPrice: 680,
      standardCost: 170,
      actualCost: 175,
      salesVolume: 510, // Star
    },
    {
      name: 'Фирменный бургер Black Angus',
      category: 'kitchen',
      sellingPrice: 790,
      standardCost: 260,
      actualCost: 315, // Warning variance
      salesVolume: 380,
    },
    {
      name: 'Медовик с соленой карамелью',
      category: 'dessert',
      sellingPrice: 480,
      standardCost: 96,
      actualCost: 102,
      salesVolume: 320,
    },
    {
      name: 'Коктейль Апероль Спритц',
      category: 'bar',
      sellingPrice: 650,
      standardCost: 140,
      actualCost: 145,
      salesVolume: 580,
    },
    {
      name: 'Лимонад Маракуйя-Мята 1л',
      category: 'bar',
      sellingPrice: 520,
      standardCost: 78,
      actualCost: 82,
      salesVolume: 440,
    },
  ]

  const created: MenuItemInput[] = []
  for (const item of defaultItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { venueId, name: item.name, period },
    })

    if (!existing) {
      const rec = await prisma.menuItem.create({
        data: {
          venueId,
          period,
          name: item.name,
          category: item.category,
          sellingPrice: item.sellingPrice,
          standardCost: item.standardCost,
          actualCost: item.actualCost,
          salesVolume: item.salesVolume,
        },
      })
      created.push({
        id: rec.id,
        name: rec.name,
        category: rec.category,
        sellingPrice: rec.sellingPrice,
        standardCost: rec.standardCost,
        actualCost: rec.actualCost,
        salesVolume: rec.salesVolume,
        period: rec.period,
      })
    } else {
      created.push({
        id: existing.id,
        name: existing.name,
        category: existing.category,
        sellingPrice: existing.sellingPrice,
        standardCost: existing.standardCost,
        actualCost: existing.actualCost,
        salesVolume: existing.salesVolume,
        period: existing.period,
      })
    }
  }

  return created
}
