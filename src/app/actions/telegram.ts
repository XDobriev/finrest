'use server'

import { prisma } from '@/lib/db/client'
import { generateAuthToken } from '@/lib/telegram/auth'
import { getCurrentUserAction } from './auth'

export interface TelegramConnectionStatus {
  isConnected: boolean
  telegramId?: string
  username?: string | null
  firstName?: string | null
  activeVenueName?: string | null
}

export interface TelegramAuthTokenResponse {
  token: string
  pin: string
  deepLink: string
  expiresAt: string
}

/**
 * Gets Telegram connection status for the current user or specified userId.
 */
export async function getTelegramStatusAction(
  userIdParam?: string
): Promise<TelegramConnectionStatus> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  if (!userId) {
    return { isConnected: false }
  }

  const account = await prisma.telegramAccount.findFirst({
    where: { userId },
    include: { venue: true },
  })

  if (!account) {
    return { isConnected: false }
  }

  return {
    isConnected: true,
    telegramId: account.telegramId.toString(),
    username: account.username,
    firstName: account.firstName,
    activeVenueName: account.venue?.name || null,
  }
}

/**
 * Creates an authorization token and 6-digit PIN for connecting Telegram.
 */
export async function createTelegramAuthTokenAction(
  userIdParam?: string,
  venueId?: string
): Promise<TelegramAuthTokenResponse> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const { token, pin, expiresAt } = await generateAuthToken(userId, venueId)
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'FinRestBot'
  const deepLink = `https://t.me/${botUsername}?start=${token}`

  return {
    token,
    pin,
    deepLink,
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * Disconnects the Telegram account linked to current user.
 */
export async function disconnectTelegramAction(
  userIdParam?: string
): Promise<{ success: boolean }> {
  const current = await getCurrentUserAction()
  const userId = userIdParam || current?.userId

  if (!userId) {
    return { success: false }
  }

  await prisma.telegramAccount.deleteMany({
    where: { userId },
  })

  return { success: true }
}
