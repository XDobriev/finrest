import { prisma } from '../db/client'
import { PLAN_CONFIG, type SubscriptionPlan } from './plans'

export async function checkVenueLimit(userId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number
  plan: SubscriptionPlan
  message?: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { venues: true },
  })

  if (!user) {
    return {
      allowed: true,
      currentCount: 0,
      maxAllowed: 1,
      plan: 'START',
    }
  }

  const plan = (user.plan as SubscriptionPlan) || 'START'
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.START
  const currentCount = user.venues.length
  const maxAllowed = config.venueLimit

  const allowed = currentCount < maxAllowed

  let message: string | undefined
  if (!allowed) {
    message = `Лимит тарифа «${config.name}» исчерпан (максимум ${maxAllowed} ${
      maxAllowed === 1 ? 'заведение' : 'заведения'
    }). Перейдите на более высокий тариф в разделе Подписка.`
  }

  return {
    allowed,
    currentCount,
    maxAllowed,
    plan,
    message,
  }
}
