'use server'

import {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
} from '@/lib/db/venues'
import { getCurrentUserAction } from './auth'
import type { Venue } from '@/types'

export async function getVenuesAction(): Promise<Venue[]> {
  const user = await getCurrentUserAction()
  const venues = await getVenues(user?.userId)
  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }))
}

export async function getVenueByIdAction(id: string): Promise<Venue | null> {
  const user = await getCurrentUserAction()
  const v = await getVenueById(id)
  if (!v) return null

  // Multi-tenancy guard: if venue has an owner and user is someone else, deny access
  if (v.ownerId && user && user.userId !== v.ownerId) {
    return null
  }

  return {
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }
}

import { PLAN_CONFIG, type SubscriptionPlan } from '@/lib/billing/plans'
import { prisma } from '@/lib/db/client'

export async function createVenueAction(
  name: string,
  address?: string
): Promise<Venue> {
  const user = await getCurrentUserAction()
  if (user?.userId) {
    return prisma.$transaction(async (tx) => {
      // Row-level lock on the user record prevents concurrent creation from exceeding plan limits
      await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.userId} FOR UPDATE`

      const dbUser = await tx.user.findUnique({
        where: { id: user.userId },
        include: { venues: true },
      })
      const plan = (dbUser?.plan as SubscriptionPlan) || 'START'
      const config = PLAN_CONFIG[plan] || PLAN_CONFIG.START

      if (dbUser && dbUser.venues.length >= config.venueLimit) {
        throw new Error(
          `Лимит тарифа «${config.name}» исчерпан (максимум ${config.venueLimit} ${
            config.venueLimit === 1 ? 'заведение' : 'заведения'
          }). Перейдите на более высокий тариф в разделе Подписка.`
        )
      }

      const v = await tx.venue.create({
        data: {
          name,
          address,
          ownerId: user.userId,
          dateToleranceDays: 1,
          amountTolerancePercent: 5.0,
          fuzzyMatchThreshold: 0.7,
        },
      })

      return {
        id: v.id,
        name: v.name,
        address: v.address ?? undefined,
        createdAt: v.createdAt.toISOString(),
        deduplicationSettings: {
          dateToleranceDays: v.dateToleranceDays,
          amountTolerancePercent: v.amountTolerancePercent,
          fuzzyMatchThreshold: v.fuzzyMatchThreshold,
        },
      }
    })
  }

  const v = await createVenue({
    name,
    address,
  })
  return {
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }
}

export async function updateVenueAction(
  id: string,
  data: Partial<{
    name: string
    address?: string
    dateToleranceDays?: number
    amountTolerancePercent?: number
    fuzzyMatchThreshold?: number
  }>
): Promise<Venue> {
  const user = await getCurrentUserAction()
  const existing = await getVenueById(id)
  if (!existing) {
    throw new Error(`Заведение с ID ${id} не найдено`)
  }

  // Multi-tenancy authorization check
  if (existing.ownerId && user && user.userId !== existing.ownerId) {
    throw new Error('Forbidden: Нет прав на управление этим заведением')
  }

  const v = await updateVenue(id, data)
  return {
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }
}

export async function deleteVenueAction(id: string): Promise<{ success: boolean }> {
  const user = await getCurrentUserAction()
  const existing = await getVenueById(id)
  if (!existing) {
    throw new Error(`Заведение с ID ${id} не найдено`)
  }

  // Multi-tenancy authorization check: only the venue owner (or unassigned demo venue) can delete
  if (existing.ownerId && user && user.userId !== existing.ownerId) {
    throw new Error('Forbidden: Нет прав на управление этим заведением')
  }

  await deleteVenue(id)
  return { success: true }
}
