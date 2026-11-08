'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  PLAN_CONFIG,
  calculateSavings,
  type SubscriptionPlan,
} from '@/lib/billing/plans'
import { createSubscriptionCheckoutAction } from '@/app/actions/billing'
import {
  ShieldCheck,
  Check,
  Calculator,
  HelpCircle,
  Loader2,
  CheckCircle2,
  UtensilsCrossed,
  Landmark,
} from 'lucide-react'

export default function PricingPage() {
  const [revenue, setRevenue] = useState<number>(2500000)
  const [venueCount, setVenueCount] = useState<number>(1)
  const [isAnnual, setIsAnnual] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState<SubscriptionPlan | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  const savings = useMemo(() => {
    return calculateSavings(revenue, venueCount)
  }, [revenue, venueCount])

  const handleCheckout = async (plan: SubscriptionPlan) => {
    setIsCheckingOut(plan)
    setCheckoutMessage(null)
    try {
      const res = await createSubscriptionCheckoutAction(plan)
      setCheckoutMessage(`Оформлен заказ на тариф «${PLAN_CONFIG[plan].name}» на сумму ${res.amount.toLocaleString('ru-RU')} ₽. Переход к оплате через ЮKassa...`)
      if (res.confirmationUrl) {
        setTimeout(() => {
          window.location.href = res.confirmationUrl
        }, 1200)
      }
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : 'Ошибка оформления подписки')
    } finally {
      setIsCheckingOut(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              F
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">FinRest</span>
              <span className="text-[10px] text-emerald-700 font-semibold block leading-none">HoReCa Finance</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <a href="#calculator" className="hover:text-emerald-700 transition">Калькулятор экономии</a>
            <a href="#plans" className="hover:text-emerald-700 transition">Тарифная сетка</a>
            <a href="#features" className="hover:text-emerald-700 transition">Возможности</a>
            <a href="#faq" className="hover:text-emerald-700 transition">Вопросы и ответы</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              В личный кабинет
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-16 pb-20">
        {/* Hero Section */}
        <section className="pt-14 pb-8 max-w-5xl mx-auto px-4 text-center space-y-4">
          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 text-xs px-3 py-1 font-semibold">
            🚀 SaaS B2B: Тарифы и прозрачная экономия
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Инвестиция в FinRest, которая окупается{' '}
            <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy">
              в 20+ раз
            </span>{' '}
            в первый же месяц
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Автоматическое исключение задвоений по накладным поставщиков, утренний забор банковских выписок и контроль себестоимости блюд на кухне.
          </p>
        </section>

        {/* Interactive Savings Calculator */}
        <section id="calculator" className="max-w-4xl mx-auto px-4 scroll-mt-20">
          <Card className="rounded-2xl border-2 border-emerald-300 shadow-lg overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator className="h-5 w-5 text-emerald-200" />
                <span className="font-bold text-sm tracking-wide">
                  Интерактивный калькулятор экономии на задвоениях и фудкосте
                </span>
              </div>
              <Badge className="bg-white/20 text-white text-[11px] border-none font-normal">
                Бенчмарки HoReCa
              </Badge>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs font-semibold text-slate-800">
                        Ежемесячная выручка заведения
                      </Label>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {revenue.toLocaleString('ru-RU')} ₽/мес
                      </span>
                    </div>
                    <input
                      type="range"
                      min={500000}
                      max={15000000}
                      step={100000}
                      value={revenue}
                      onChange={(e) => setRevenue(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                      <span>500 тыс. ₽</span>
                      <span>5 млн. ₽</span>
                      <span>15 млн. ₽</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs font-semibold text-slate-800">
                        Количество заведений (точек)
                      </Label>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {venueCount} {venueCount === 1 ? 'ресторан' : venueCount < 5 ? 'ресторана' : 'ресторанов'}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 5, 10].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setVenueCount(count)}
                          className={`py-2 text-xs font-semibold rounded-lg border transition ${
                            venueCount === count
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {count} {count === 1 ? 'точка' : count < 5 ? 'точки' : 'точек'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Real-time Calculation Result */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider block mb-3">
                      Прогнозируемый финансовый эффект в месяц
                    </span>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          🛡️ Устранение задвоений (1.5%)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          +{savings.duplicateSavings.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          🥗 Контроль фудкоста и перерасхода (2.0%)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          +{savings.foodCostSavings.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">Итоговая чистая выгода:</span>
                      <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                        +{savings.netProfit.toLocaleString('ru-RU')} ₽/мес
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Окупаемость подписки (ROI):</span>
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">
                        +{savings.roiPercent}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Pricing Table Section */}
        <section id="plans" className="max-w-6xl mx-auto px-4 scroll-mt-20 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Прозрачные тарифы без скрытых платежей
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Выберите подходящий тариф в зависимости от масштаба вашей ресторанной сети
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 mt-2">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                  !isAnnual ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ежемесячно
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  isAnnual ? 'bg-emerald-600 shadow-xs text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ежегодно
                <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full font-bold">
                  2 мес в подарок
                </span>
              </button>
            </div>
          </div>

          {checkoutMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 max-w-2xl mx-auto">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{checkoutMessage}</span>
            </div>
          )}

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['START', 'BUSINESS', 'CHAIN'] as SubscriptionPlan[]).map((planKey) => {
              const plan = PLAN_CONFIG[planKey]
              const isPopular = plan.popular
              const price = isAnnual ? Math.round(plan.annualPrice / 12) : plan.price
              const isRecommended = savings.recommendedPlan === planKey

              return (
                <Card
                  key={planKey}
                  className={`rounded-2xl transition-all relative flex flex-col justify-between ${
                    isPopular
                      ? 'border-2 border-emerald-500 shadow-lg scale-102 bg-white'
                      : 'border border-slate-200 shadow-sm bg-white'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1 shadow-sm">
                        Хит продаж
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="p-6 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-slate-900">
                        {plan.name}
                      </CardTitle>
                      {isRecommended && (
                        <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-800 bg-emerald-50">
                          Подходит вам
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                      {plan.description}
                    </p>

                    <div className="pt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 font-mono">
                        {price.toLocaleString('ru-RU')} ₽
                      </span>
                      <span className="text-xs text-slate-500">/ мес</span>
                    </div>
                    {isAnnual && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        {plan.annualPrice.toLocaleString('ru-RU')} ₽ при оплате за год
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="p-6 pt-0 space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Что включено:
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => handleCheckout(planKey)}
                      disabled={isCheckingOut === planKey}
                      className={`w-full text-xs font-semibold h-10 mt-6 ${
                        isPopular
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isCheckingOut === planKey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Выбрать тариф «${plan.name}»`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Feature Comparison Highlights */}
        <section id="features" className="max-w-5xl mx-auto px-4 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Создано специально для рестораторов и шеф-поваров
            </h2>
            <p className="text-xs text-slate-500">
              Никаких громоздких 1С интерфейсов. Только то, что нужно для роста чистой прибыли.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-5 border-slate-200 shadow-sm space-y-2.5">
              <div className="p-2 w-fit rounded-lg bg-blue-100 text-blue-700">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Open API Банков (Т-Банк & Точка)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Забудьте о ручных экспортах выписок из банк-клиента. FinRest автоматически забирает проводки каждое утро в 06:00.
              </p>
            </Card>

            <Card className="p-5 border-slate-200 shadow-sm space-y-2.5">
              <div className="p-2 w-fit rounded-lg bg-emerald-100 text-emerald-700">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Матрица Касаваны-Смита</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Разделение меню на «Звёзды», «Лошадки», «Загадки» и «Собаки». Контроль нормативного vs фактического фудкоста.
              </p>
            </Card>

            <Card className="p-5 border-slate-200 shadow-sm space-y-2.5">
              <div className="p-2 w-fit rounded-lg bg-purple-100 text-purple-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Защита данных по 152-ФЗ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Все серверы и базы данных PostgreSQL 17 размещены на территории РФ в соответствии с законодательством.
              </p>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Часто задаваемые вопросы
            </h2>
            <p className="text-xs text-slate-500">
              Ответы на популярные вопросы о подключении и подписке
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Как работает защита от задвоений расходов?',
                a: 'FinRest сопоставляет операции из кассовой системы iiko, банковских выписок и Telegram-чеков по сумме, дате (допуск ±N дней) и нечеткому совпадению контрагента. Вы подтверждаете склейку одной кнопкой.',
              },
              {
                q: 'Безопасно ли подключать банк через Open API?',
                a: 'Да. Мы используем официальные протоколы Open Banking с правами «только на чтение выписки». FinRest не имеет права совершать платежи или списывать средства с ваших расчетных счетов.',
              },
              {
                q: 'Можно ли сменить тариф при открытии нового заведения?',
                a: 'Да, переход между тарифами происходит мгновенно в личном кабинете. Неиспользованные средства пересчитываются пропорционально дням.',
              },
              {
                q: 'Предоставляются ли закрывающие бухгалтерские документы?',
                a: 'Да, для юридических лиц и ИП мы формируем УПД через ЭДО (Диадок / СБИС) в конце каждого отчетного периода.',
              },
            ].map((item, idx) => (
              <Card key={idx} className="p-4 border-slate-200 shadow-xs space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  {item.q}
                </h4>
                <p className="text-xs text-slate-600 pl-5.5 leading-relaxed">
                  {item.a}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 FinRest. Все права защищены. Разработано для ресторанного бизнеса РФ (152-ФЗ).</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-800">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-slate-800">Оферта</Link>
            <Link href="/dashboard" className="hover:text-slate-800">Личный кабинет</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
