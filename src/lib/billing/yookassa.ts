import { prisma } from '../db/client'
import { PLAN_CONFIG, type SubscriptionPlan } from './plans'

export interface YooKassaConfig {
  shopId?: string
  secretKey?: string
  isSandbox?: boolean
}

export interface CreatePaymentInput {
  userId: string
  plan: SubscriptionPlan
  returnUrl: string
}

export interface PaymentSessionResult {
  paymentId: string
  confirmationUrl: string
  amount: number
  plan: SubscriptionPlan
}

export class YooKassaClient {
  private shopId?: string
  private secretKey?: string
  private isSandbox: boolean

  constructor(config?: YooKassaConfig) {
    this.shopId = config?.shopId || process.env.YOOKASSA_SHOP_ID
    this.secretKey = config?.secretKey || process.env.YOOKASSA_SECRET_KEY
    this.isSandbox = config?.isSandbox ?? (!this.shopId || !this.secretKey)
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentSessionResult> {
    const planConfig = PLAN_CONFIG[input.plan]
    if (!planConfig) {
      throw new Error(`Неизвестный тариф: ${input.plan}`)
    }

    const amount = planConfig.price
    const paymentId = `yk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const confirmationUrl = input.returnUrl.includes('?')
      ? `${input.returnUrl}&payment_id=${paymentId}`
      : `${input.returnUrl}?payment_id=${paymentId}`

    // Create payment order in database
    await prisma.paymentOrder.create({
      data: {
        userId: input.userId,
        plan: input.plan,
        amount,
        currency: 'RUB',
        paymentGateway: 'yookassa',
        externalPaymentId: paymentId,
        status: 'pending',
        confirmationUrl,
      },
    })

    return {
      paymentId,
      confirmationUrl,
      amount,
      plan: input.plan,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(payload: any): Promise<{
    handled: boolean
    orderId?: string
    userId?: string
    plan?: string
    status?: string
  }> {
    if (payload.type !== 'notification' || payload.event !== 'payment.succeeded') {
      return { handled: false }
    }

    const paymentObject = payload.object
    const externalId = paymentObject?.id
    if (!externalId) {
      return { handled: false }
    }

    const order = await prisma.paymentOrder.findFirst({
      where: { externalPaymentId: externalId },
      include: { user: true },
    })

    if (!order) {
      console.warn(`PaymentOrder with externalId ${externalId} not found`)
      return { handled: false }
    }

    // 1. Mark order as succeeded
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'succeeded',
        paidAt: new Date(),
      },
    })

    // 2. Extend or activate user subscription (+30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000)

    await prisma.user.update({
      where: { id: order.userId },
      data: {
        plan: order.plan,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: thirtyDaysFromNow,
      },
    })

    return {
      handled: true,
      orderId: order.id,
      userId: order.userId,
      plan: order.plan,
      status: 'succeeded',
    }
  }
}
