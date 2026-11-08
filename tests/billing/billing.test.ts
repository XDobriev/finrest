import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import { checkVenueLimit } from '../../src/lib/billing/limits'
import { calculateSavings } from '../../src/lib/billing/plans'
import { YooKassaClient } from '../../src/lib/billing/yookassa'
import { NextRequest } from 'next/server'
import { POST as yookassaWebhookHandler } from '../../src/app/api/webhooks/yookassa/route'

test('Pricing & ROI Calculator: calculates HoReCa duplicate and food cost savings accurately', () => {
  // Scenario 1: 1 venue with 2,500,000 ₽ monthly revenue
  const calc1 = calculateSavings(2500000, 1)

  // 1.5% duplicate savings = 37,500 ₽
  assert.equal(calc1.duplicateSavings, 37500)
  // 2.0% food cost savings = 50,000 ₽
  assert.equal(calc1.foodCostSavings, 50000)
  // Total savings = 87,500 ₽
  assert.equal(calc1.totalSavings, 87500)
  // Recommended plan for 1 venue = START (3,900 ₽)
  assert.equal(calc1.planCost, 3900)
  assert.equal(calc1.netProfit, 87500 - 3900)
  // ROI = Math.round((netProfit / planCost) * 100) = (83600 / 3900) * 100 = 2144%
  assert.equal(calc1.roiPercent, 2144)

  // Scenario 2: 3 venues with 4,000,000 ₽ monthly revenue each
  const calc2 = calculateSavings(4000000, 3)
  assert.equal(calc2.planCost, 8900) // BUSINESS plan
  assert.ok(calc2.totalSavings > 400000)
  assert.ok(calc2.roiPercent > 4000)
})

test('Plan Limits: validates venue count against user subscription tier', async () => {
  const userStart = await prisma.user.create({
    data: {
      email: `start_user_${Date.now()}@finrest.ru`,
      plan: 'START',
      subscriptionStatus: 'active',
    },
  })

  try {
    // START tier allows 1 venue
    const checkBefore = await checkVenueLimit(userStart.id)
    assert.equal(checkBefore.allowed, true)
    assert.equal(checkBefore.maxAllowed, 1)

    // Create 1st venue
    await prisma.venue.create({
      data: { name: 'Первое кафе', ownerId: userStart.id },
    })

    // START tier should now disallow creating 2nd venue
    const checkAfter = await checkVenueLimit(userStart.id)
    assert.equal(checkAfter.allowed, false)
    assert.equal(checkAfter.currentCount, 1)
    assert.equal(checkAfter.maxAllowed, 1)

    // Upgrade user to BUSINESS (allows up to 3 venues)
    await prisma.user.update({
      where: { id: userStart.id },
      data: { plan: 'BUSINESS' },
    })

    const checkBusiness = await checkVenueLimit(userStart.id)
    assert.equal(checkBusiness.allowed, true)
    assert.equal(checkBusiness.maxAllowed, 3)

  } finally {
    await prisma.venue.deleteMany({ where: { ownerId: userStart.id } })
    await prisma.user.delete({ where: { id: userStart.id } }).catch(() => {})
  }
})

test('YooKassa Client: creates payment session and handles webhook to activate subscription', async () => {
  const user = await prisma.user.create({
    data: {
      email: `billing_test_${Date.now()}@finrest.ru`,
      plan: 'START',
      subscriptionStatus: 'active',
    },
  })

  try {
    const client = new YooKassaClient({ isSandbox: true })

    // 1. Create checkout session for BUSINESS plan (8,900 ₽)
    const session = await client.createPayment({
      userId: user.id,
      plan: 'BUSINESS',
      returnUrl: 'https://finrest.ru/pricing?success=true',
    })

    assert.ok(session.paymentId)
    assert.equal(session.amount, 8900)
    assert.ok(session.confirmationUrl)

    // Check payment order created in DB
    const order = await prisma.paymentOrder.findUnique({
      where: { externalPaymentId: session.paymentId },
    })
    assert.ok(order)
    assert.equal(order.status, 'pending')
    assert.equal(order.plan, 'BUSINESS')

    // 2. Simulate YooKassa payment.succeeded webhook
    const webhookPayload = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: session.paymentId,
        status: 'succeeded',
        amount: { value: '8900.00', currency: 'RUB' },
        metadata: { userId: user.id, plan: 'BUSINESS' },
      },
    }

    const handled = await client.handleWebhook(webhookPayload)
    assert.equal(handled.handled, true)
    assert.equal(handled.plan, 'BUSINESS')

    // 3. Verify user was upgraded in DB
    const upgradedUser = await prisma.user.findUnique({
      where: { id: user.id },
    })
    assert.equal(upgradedUser?.plan, 'BUSINESS')
    assert.equal(upgradedUser?.subscriptionStatus, 'active')
    assert.ok(upgradedUser?.subscriptionExpiresAt)

    // 4. Verify order marked as succeeded
    const updatedOrder = await prisma.paymentOrder.findUnique({
      where: { id: order.id },
    })
    assert.equal(updatedOrder?.status, 'succeeded')
    assert.ok(updatedOrder?.paidAt)

  } finally {
    await prisma.paymentOrder.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('YooKassa Webhook Route: processes HTTP POST notification', async () => {
  const user = await prisma.user.create({
    data: { email: `route_billing_${Date.now()}@finrest.ru`, plan: 'START' },
  })

  try {
    const client = new YooKassaClient({ isSandbox: true })
    const session = await client.createPayment({
      userId: user.id,
      plan: 'CHAIN',
      returnUrl: 'https://finrest.ru/pricing',
    })

    const req = new NextRequest('http://localhost:3000/api/webhooks/yookassa', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'notification',
        event: 'payment.succeeded',
        object: {
          id: session.paymentId,
          status: 'succeeded',
          amount: { value: '15900.00', currency: 'RUB' },
          metadata: { userId: user.id, plan: 'CHAIN' },
        },
      }),
    })

    const res = await yookassaWebhookHandler(req)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.ok, true)

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    assert.equal(updatedUser?.plan, 'CHAIN')

  } finally {
    await prisma.paymentOrder.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('YooKassa Webhook: preserves existing active subscription duration when renewing early', async () => {
  const futureExpiry = new Date(Date.now() + 25 * 86400000)
  const user = await prisma.user.create({
    data: {
      email: `renewal_${Date.now()}@finrest.ru`,
      plan: 'START',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: futureExpiry,
    },
  })

  try {
    const client = new YooKassaClient({ isSandbox: true })
    const session = await client.createPayment({
      userId: user.id,
      plan: 'BUSINESS',
      returnUrl: 'https://finrest.ru/pricing',
    })

    await client.handleWebhook({
      type: 'notification',
      event: 'payment.succeeded',
      object: { id: session.paymentId },
    })

    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    assert.ok(updated?.subscriptionExpiresAt)

    const remainingDays = (updated.subscriptionExpiresAt.getTime() - Date.now()) / 86400000
    // Should be approximately 25 + 30 = 55 days (at least 53 days)
    assert.ok(
      remainingDays >= 53,
      `Prepaid days must be preserved! Expected >= 53 days, got ${remainingDays.toFixed(1)} days`
    )

  } finally {
    await prisma.paymentOrder.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Plan Limits: atomic transactional lock prevents concurrent venue creation from exceeding subscription limit', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers')
  const originalCookies = nextHeaders.cookies
  const { createSessionToken } = await import('../../src/lib/auth/jwt')
  const { createVenueAction } = await import('../../src/app/actions/venues')

  const user = await prisma.user.create({
    data: {
      email: `concurrent_limit_${Date.now()}@finrest.ru`,
      plan: 'START',
      subscriptionStatus: 'active',
    },
  })

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: 'OWNER',
  })

  try {
    nextHeaders.cookies = async () => ({
      get: (name: string) => (name === 'finrest_session' ? { value: token } : undefined),
      set: () => {},
      delete: () => {},
    })

    // Concurrently invoke createVenueAction twice for a user with START plan (limit 1)
    const results = await Promise.allSettled([
      createVenueAction('Параллельное Кафе 1'),
      createVenueAction('Параллельное Кафе 2'),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    // Exactly 1 must succeed and exactly 1 must fail due to plan limit
    assert.equal(fulfilled.length, 1, 'Only 1 venue creation must succeed')
    assert.equal(rejected.length, 1, 'The 2nd concurrent creation must be rejected')

    const dbVenues = await prisma.venue.findMany({ where: { ownerId: user.id } })
    assert.equal(dbVenues.length, 1, 'DB must contain strictly 1 venue adhering to plan limit')

  } finally {
    nextHeaders.cookies = originalCookies
    await prisma.venue.deleteMany({ where: { ownerId: user.id } })
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})
