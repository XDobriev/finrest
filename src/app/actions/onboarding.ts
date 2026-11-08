'use server'

import { prisma } from '@/lib/db/client'
import { getCurrentUserAction } from './auth'
import { generateDemoDataset } from '@/lib/onboarding/demo-data'
import { runDeduplicationAction } from './deduplication'

export interface OnboardingStatus {
  completed: boolean
  step: number
  hasVenues: boolean
  venueId: string | null
}

export interface OnboardingStepUpdate {
  success: boolean
  step: number
  completed: boolean
}

export interface SeedDemoResult {
  success: boolean
  transactionsCount: number
  deduplicationPairsCount: number
  menuItemsCount: number
  error?: string
}

/**
 * Returns current onboarding status, step, and venue association.
 */
export async function getOnboardingStatusAction(
  userIdParam?: string
): Promise<OnboardingStatus> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  if (!userId) {
    return {
      completed: false,
      step: 0,
      hasVenues: false,
      venueId: null,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      venues: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!user) {
    return {
      completed: false,
      step: 0,
      hasVenues: false,
      venueId: null,
    }
  }

  return {
    completed: user.onboardingCompleted,
    step: user.onboardingStep,
    hasVenues: user.venues.length > 0,
    venueId: user.venues[0]?.id || null,
  }
}

/**
 * Updates the current user's onboarding progress step and completed flag.
 */
export async function updateOnboardingStatusAction(
  step: number,
  completed?: boolean,
  userIdParam?: string
): Promise<OnboardingStepUpdate> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const updateData: { onboardingStep: number; onboardingCompleted?: boolean } = {
    onboardingStep: Math.max(0, step),
  }
  if (completed !== undefined) {
    updateData.onboardingCompleted = completed
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })

  return {
    success: true,
    step: updated.onboardingStep,
    completed: updated.onboardingCompleted,
  }
}

/**
 * Resets the onboarding status so user can experience the tutorial tour anew.
 */
export async function resetOnboardingAction(
  userIdParam?: string
): Promise<OnboardingStepUpdate> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStep: 0,
      onboardingCompleted: false,
    },
  })

  return {
    success: true,
    step: updated.onboardingStep,
    completed: updated.onboardingCompleted,
  }
}

/**
 * Seeds a newly created venue with comprehensive, realistic restaurant data
 * for instant exploration (Transactions, Deduplication pairs, Cash balances, Menu Items).
 */
export async function seedDemoDataAction(
  venueId: string,
  userIdParam?: string
): Promise<SeedDemoResult> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  })

  if (!venue) {
    return {
      success: false,
      transactionsCount: 0,
      deduplicationPairsCount: 0,
      menuItemsCount: 0,
      error: `Заведение с ID ${venueId} не найдено`,
    }
  }

  // Multi-tenancy check
  if (venue.ownerId && userId && venue.ownerId !== userId) {
    return {
      success: false,
      transactionsCount: 0,
      deduplicationPairsCount: 0,
      menuItemsCount: 0,
      error: 'Forbidden: Нет прав на управление этим заведением',
    }
  }

  try {
    const { transactions, initialCash, menuItems } = generateDemoDataset(venueId)

    // 1. Insert transactions
    await prisma.transaction.createMany({
      data: transactions.map((tx) => ({
        ...tx,
        date: new Date(tx.date + 'T12:00:00Z'),
        status: 'unique',
      })),
    })

    // 2. Run deduplication engine to discover pairs
    const pairs = await runDeduplicationAction(venueId)

    // 3. Upsert Cash Balance snapshot
    await prisma.cashBalance.upsert({
      where: {
        venueId_monthKey: {
          venueId,
          monthKey: initialCash.monthKey,
        },
      },
      create: {
        venueId,
        monthKey: initialCash.monthKey,
        amount: initialCash.amount,
        bankBalance: initialCash.bankBalance,
        safeBalance: initialCash.safeBalance,
        shiftBalance: initialCash.shiftBalance,
      },
      update: {
        amount: initialCash.amount,
        bankBalance: initialCash.bankBalance,
        safeBalance: initialCash.safeBalance,
        shiftBalance: initialCash.shiftBalance,
      },
    })

    // 4. Insert Menu Items for Kasavana-Smith Matrix & Food Cost Engine
    await prisma.menuItem.createMany({
      data: menuItems.map((item) => ({
        ...item,
        venueId,
      })),
    })

    return {
      success: true,
      transactionsCount: transactions.length,
      deduplicationPairsCount: pairs.length,
      menuItemsCount: menuItems.length,
    }
  } catch (err) {
    return {
      success: false,
      transactionsCount: 0,
      deduplicationPairsCount: 0,
      menuItemsCount: 0,
      error: err instanceof Error ? err.message : 'Ошибка генерации демо-данных',
    }
  }
}
