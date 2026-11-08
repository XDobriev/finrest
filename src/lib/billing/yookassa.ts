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
    let paymentId = `yk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    let confirmationUrl = input.returnUrl.includes('?')
      ? `${input.returnUrl}&payment_id=${paymentId}`
      : `${input.returnUrl}?payment_id=${paymentId}`

    if (!this.isSandbox && this.shopId && this.secretKey) {
      try {
        const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')
        const idempotenceKey = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const res = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotenceKey,
          },
          body: JSON.stringify({
            amount: {
              value: `${amount}.00`,
              currency: 'RUB',
            },
            capture: true,
            confirmation: {
              type: 'redirect',
              return_url: input.returnUrl,
            },
            description: `Подписка FinRest на тариф «${planConfig.name}»`,
            metadata: {
              userId: input.userId,
              plan: input.plan,
            },
          }),
        })

        if (!res.ok) {
          throw new Error(`YooKassa API HTTP ${res.status}: ${res.statusText}`)
        }

        const data = await res.json()
        if (data.id) {
          paymentId = data.id
        }
        if (data.confirmation?.confirmation_url) {
          confirmationUrl = data.confirmation.confirmation_url
        }
      } catch (err) {
        throw new Error(
          `Ошибка создания платежа в ЮKassa: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

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

    // 2. Extend or activate user subscription (+30 days from existing expiry or now)
    const now = new Date()
    const currentUser = await prisma.user.findUnique({
      where: { id: order.userId },
    })
    const baseDate =
      currentUser?.subscriptionExpiresAt && currentUser.subscriptionExpiresAt > now
        ? currentUser.subscriptionExpiresAt
        : now
    const newExpiresAt = new Date(baseDate.getTime() + 30 * 86400000)

    await prisma.user.update({
      where: { id: order.userId },
      data: {
        plan: order.plan,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: newExpiresAt,
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
