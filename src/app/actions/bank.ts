'use server'

import { prisma } from '@/lib/db/client'
import { TBankClient } from '@/lib/bank/tbank-client'
import { TochkaClient } from '@/lib/bank/tochka-client'
import { syncBankConnection } from '@/lib/bank/sync'
import type { BankType, BankSyncResult } from '@/lib/bank/types'

export interface ConnectBankInput {
  bankType: BankType
  accountNumber?: string
  token: string
  clientId?: string
  clientSecret?: string
  isSandbox?: boolean
}

export interface BankConnectionDto {
  id: string
  venueId: string
  bankType: string
  accountNumber: string | null
  isSandbox: boolean
  status: string
  lastSyncAt: string | null
  lastErrorMessage: string | null
  createdAt: string
}

export async function testBankAction(
  bankType: BankType,
  token: string,
  isSandbox = true
): Promise<{ success: boolean; message: string }> {
  try {
    let isValid = false
    if (bankType === 'TBANK') {
      const client = new TBankClient({ token, isSandbox })
      isValid = await client.testConnection()
    } else if (bankType === 'TOCHKA') {
      const client = new TochkaClient({ token, isSandbox })
      isValid = await client.testConnection()
    }

    if (isValid) {
      return { success: true, message: 'Соединение с банком успешно проверено' }
    } else {
      return { success: false, message: 'Не удалось авторизоваться в банке. Проверьте токен.' }
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Ошибка тестирования подключения',
    }
  }
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

export async function connectBankAction(
  venueId: string,
  input: ConnectBankInput
): Promise<BankConnectionDto> {
  const hasAccess = await verifyVenueAccess(venueId)
  if (!hasAccess) {
    throw new Error('Нет прав на управление этим заведением')
  }

  const existing = await prisma.bankConnection.findFirst({
    where: {
      venueId,
      bankType: input.bankType,
    },
  })

  let connection
  if (existing) {
    connection = await prisma.bankConnection.update({
      where: { id: existing.id },
      data: {
        accountNumber: input.accountNumber || existing.accountNumber,
        token: input.token,
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        isSandbox: input.isSandbox ?? true,
        status: 'connected',
        lastErrorMessage: null,
      },
    })
  } else {
    connection = await prisma.bankConnection.create({
      data: {
        venueId,
        bankType: input.bankType,
        accountNumber: input.accountNumber,
        token: input.token,
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        isSandbox: input.isSandbox ?? true,
        status: 'connected',
      },
    })
  }

  return {
    id: connection.id,
    venueId: connection.venueId,
    bankType: connection.bankType,
    accountNumber: connection.accountNumber,
    isSandbox: connection.isSandbox,
    status: connection.status,
    lastSyncAt: connection.lastSyncAt ? connection.lastSyncAt.toISOString() : null,
    lastErrorMessage: connection.lastErrorMessage,
    createdAt: connection.createdAt.toISOString(),
  }
}

export async function getBankConnectionsAction(
  venueId: string
): Promise<BankConnectionDto[]> {
  const hasAccess = await verifyVenueAccess(venueId)
  if (!hasAccess) {
    return []
  }

  const list = await prisma.bankConnection.findMany({
    where: { venueId },
    orderBy: { createdAt: 'desc' },
  })

  return list.map((c) => ({
    id: c.id,
    venueId: c.venueId,
    bankType: c.bankType,
    accountNumber: c.accountNumber,
    isSandbox: c.isSandbox,
    status: c.status,
    lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
    lastErrorMessage: c.lastErrorMessage,
    createdAt: c.createdAt.toISOString(),
  }))
}

export async function disconnectBankAction(
  connectionId: string
): Promise<{ success: boolean }> {
  const conn = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    select: { venueId: true },
  })
  if (!conn) throw new Error('Подключение не найдено')

  const hasAccess = await verifyVenueAccess(conn.venueId)
  if (!hasAccess) {
    throw new Error('Нет прав на управление этим подключением')
  }

  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: { status: 'disconnected' },
  })
  return { success: true }
}

export async function syncBankAction(
  connectionId: string
): Promise<BankSyncResult> {
  const conn = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    select: { venueId: true },
  })
  if (!conn) {
    throw new Error('Подключение не найдено')
  }

  const hasAccess = await verifyVenueAccess(conn.venueId)
  if (!hasAccess) {
    throw new Error('Нет прав на синхронизацию этого заведения')
  }

  return syncBankConnection(connectionId)
}
