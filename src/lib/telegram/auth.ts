import crypto from 'node:crypto'
import { prisma } from '../db/client'

export interface TelegramUserData {
  id: number | bigint
  username?: string | null
  firstName?: string | null
  lastName?: string | null
}

export interface AuthTokenResult {
  token: string
  pin: string
  expiresAt: Date
}

/**
 * Generates an authorization token and 6-digit PIN for Telegram bot linking.
 * Valid for 10 minutes by default.
 */
export async function generateAuthToken(
  userId: string,
  venueId?: string,
  ttlMinutes = 10
): Promise<AuthTokenResult> {
  const token = `auth_${crypto.randomBytes(16).toString('hex')}`
  const pin = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

  await prisma.telegramAuthToken.create({
    data: {
      userId,
      venueId: venueId || null,
      token,
      pin,
      expiresAt,
    },
  })

  return { token, pin, expiresAt }
}

/**
 * Normalizes input string: handles "482-195", "482195", "start=auth_...", "auth_..."
 */
export function normalizeTokenOrPin(rawInput: string): string {
  const cleaned = rawInput.trim().replace(/^start=/, '')
  // If it's formatted PIN like "482-195" or digits with spaces
  const digitsOnly = cleaned.replace(/[\s-]/g, '')
  if (/^\d{6}$/.test(digitsOnly)) {
    return digitsOnly
  }
  return cleaned
}

/**
 * Verifies a token or PIN and links the user's Telegram account.
 */
export async function verifyAndLinkTelegramAccount(
  telegramUser: TelegramUserData,
  tokenOrPin: string
) {
  const normalized = normalizeTokenOrPin(tokenOrPin)
  const now = new Date()

  // Find valid token or pin
  const authToken = await prisma.telegramAuthToken.findFirst({
    where: {
      OR: [{ token: normalized }, { pin: normalized }],
      expiresAt: { gt: now },
    },
  })

  if (!authToken) {
    return {
      success: false,
      error: 'Код недействителен или срок его действия истек.',
    }
  }

  // Resolve active venue (token.venueId or user's first venue)
  let activeVenueId = authToken.venueId
  if (!activeVenueId) {
    const userVenues = await prisma.venue.findMany({
      where: { ownerId: authToken.userId },
      take: 1,
    })
    if (userVenues.length > 0) {
      activeVenueId = userVenues[0].id
    }
  }

  const tgBigInt = BigInt(telegramUser.id)

  // Upsert TelegramAccount
  const account = await prisma.telegramAccount.upsert({
    where: { telegramId: tgBigInt },
    update: {
      userId: authToken.userId,
      activeVenueId,
      username: telegramUser.username ?? null,
      firstName: telegramUser.firstName ?? null,
      lastName: telegramUser.lastName ?? null,
    },
    create: {
      telegramId: tgBigInt,
      userId: authToken.userId,
      activeVenueId,
      username: telegramUser.username ?? null,
      firstName: telegramUser.firstName ?? null,
      lastName: telegramUser.lastName ?? null,
    },
  })

  // Delete consumed token
  await prisma.telegramAuthToken.delete({
    where: { id: authToken.id },
  }).catch(() => {})

  return {
    success: true,
    account,
  }
}

/**
 * Fetches Telegram account details with user and active venue.
 */
export async function getTelegramAccount(telegramId: number | bigint) {
  return prisma.telegramAccount.findUnique({
    where: { telegramId: BigInt(telegramId) },
    include: {
      user: {
        include: {
          venues: true,
        },
      },
      venue: true,
    },
  })
}

/**
 * Switches the active venue for the Telegram account.
 */
export async function setActiveVenue(telegramId: number | bigint, venueId: string): Promise<boolean> {
  const tgBigInt = BigInt(telegramId)
  const account = await prisma.telegramAccount.findUnique({
    where: { telegramId: tgBigInt },
  })

  if (!account) return false

  // Verify venue belongs to the user
  const venue = await prisma.venue.findFirst({
    where: { id: venueId, ownerId: account.userId },
  })

  if (!venue) return false

  await prisma.telegramAccount.update({
    where: { telegramId: tgBigInt },
    data: { activeVenueId: venueId },
  })

  return true
}
