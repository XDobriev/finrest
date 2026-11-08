import { prisma } from '../db/client'

export type SubscriptionPlan = 'START' | 'BUSINESS' | 'CHAIN'

export interface PlanConfig {
  id: SubscriptionPlan
  name: string
  price: number
  annualPrice: number
  venueLimit: number
  description: string
  features: string[]
  hasBankIntegration: boolean
  hasMenuEngineering: boolean
  popular?: boolean
}

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanConfig> = {
  START: {
    id: 'START',
    name: 'Старт',
    price: 3900,
    annualPrice: 39000,
    venueLimit: 1,
    description: 'Для одного ресторана, кафе или бара, начинающего наводить порядок в финансах',
    features: [
      '1 ресторан или кофейня',
      'Управленческий учет (ОПиУ, ДДС, Баланс)',
      'Telegram-бот для шефа и управляющего',
      'Распознавание чеков по QR 54-ФЗ и фото',
      'Экспорт отчетов в Excel',
      'Защита данных по 152-ФЗ',
    ],
    hasBankIntegration: false,
    hasMenuEngineering: false,
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Бизнес',
    price: 8900,
    annualPrice: 89000,
    venueLimit: 3,
    popular: true,
    description: 'Для развивающихся заведений и небольших сетей до 3 точек с контролем фудкоста',
    features: [
      'До 3 ресторанов сети',
      'Все возможности тарифа «Старт»',
      'Прямая интеграция с банками (Т-Банк, Точка)',
      'Автоматический утренний забор выписок в 06:00',
      'Инженерия меню Касаваны-Смита & ABC/XYZ',
      'Контроль фудкоста и фиксация перерасхода кухни',
      'Приоритетная линия поддержки',
    ],
    hasBankIntegration: true,
    hasMenuEngineering: true,
  },
  CHAIN: {
    id: 'CHAIN',
    name: 'Сеть',
    price: 15900,
    annualPrice: 159000,
    venueLimit: Infinity,
    description: 'Для ресторанных сетей, холдингов и франшиз без ограничений по масштабу',
    features: [
      'Неограниченное число заведений',
      'Все возможности тарифа «Бизнес»',
      'Выделенный финансовый консультант HoReCa',
      'Кастомные интеграции по API и вебхукам',
      'Персональный SLA доступности 99.9%',
      'Обучение команды и консалтинг по налогам',
    ],
    hasBankIntegration: true,
    hasMenuEngineering: true,
  },
}

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

export interface SavingsCalculation {
  monthlyRevenue: number
  venueCount: number
  duplicateSavings: number
  foodCostSavings: number
  totalSavings: number
  planCost: number
  netProfit: number
  roiPercent: number
  recommendedPlan: SubscriptionPlan
}

export function calculateSavings(
  monthlyRevenue: number,
  venueCount: number
): SavingsCalculation {
  // HoReCa benchmarks:
  // 1.5% duplicate expenses eliminated by iiko + bank matching
  const duplicateSavings = Math.round(monthlyRevenue * 0.015 * venueCount)

  // 2.0% food cost leakage eliminated by standard tech card & waste control
  const foodCostSavings = Math.round(monthlyRevenue * 0.020 * venueCount)

  const totalSavings = duplicateSavings + foodCostSavings

  let recommendedPlan: SubscriptionPlan = 'START'
  let planCost = PLAN_CONFIG.START.price

  if (venueCount > 3) {
    recommendedPlan = 'CHAIN'
    planCost = PLAN_CONFIG.CHAIN.price
  } else if (venueCount > 1) {
    recommendedPlan = 'BUSINESS'
    planCost = PLAN_CONFIG.BUSINESS.price
  }

  const netProfit = totalSavings - planCost
  const roiPercent = planCost > 0 ? Math.round((netProfit / planCost) * 100) : 0

  return {
    monthlyRevenue,
    venueCount,
    duplicateSavings,
    foodCostSavings,
    totalSavings,
    planCost,
    netProfit,
    roiPercent,
    recommendedPlan,
  }
}
