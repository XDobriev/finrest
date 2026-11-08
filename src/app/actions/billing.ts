'use server'

import { prisma } from '@/lib/db/client'
import { getCurrentUserAction } from './auth'
import { PLAN_CONFIG, type SubscriptionPlan } from '@/lib/billing/plans'
import { YooKassaClient } from '@/lib/billing/yookassa'

export interface UserSubscriptionDto {
  plan: SubscriptionPlan
  planName: string
  subscriptionStatus: string
  subscriptionExpiresAt: string | null
  venuesCount: number
  venueLimit: number
  price: number
}

export async function getUserSubscriptionAction(): Promise<UserSubscriptionDto> {
  const currentUser = await getCurrentUserAction()
  if (!currentUser?.userId) {
    return {
      plan: 'START',
      planName: PLAN_CONFIG.START.name,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: null,
      venuesCount: 0,
      venueLimit: 1,
      price: PLAN_CONFIG.START.price,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    include: { venues: true },
  })

  const plan = (user?.plan as SubscriptionPlan) || 'START'
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.START

  return {
    plan,
    planName: config.name,
    subscriptionStatus: user?.subscriptionStatus || 'active',
    subscriptionExpiresAt: user?.subscriptionExpiresAt
      ? user.subscriptionExpiresAt.toISOString()
      : null,
    venuesCount: user?.venues.length || 0,
    venueLimit: config.venueLimit,
    price: config.price,
  }
}

export async function createSubscriptionCheckoutAction(
  plan: SubscriptionPlan,
  returnUrl = '/pricing?status=success'
) {
  const currentUser = await getCurrentUserAction()
  if (!currentUser?.userId) {
    throw new Error('Необходима авторизация для оформления подписки')
  }

  const client = new YooKassaClient()
  return client.createPayment({
    userId: currentUser.userId,
    plan,
    returnUrl,
  })
}

export async function getUserInvoicesAction() {
  const currentUser = await getCurrentUserAction()
  if (!currentUser?.userId) return []

  const orders = await prisma.paymentOrder.findMany({
    where: { userId: currentUser.userId },
    orderBy: { createdAt: 'desc' },
  })

  return orders.map((o) => ({
    id: o.id,
    plan: o.plan,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    externalPaymentId: o.externalPaymentId,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
  }))
}
