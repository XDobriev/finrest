'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { QRCode } from '@/components/ui/qr-code'
import {
  createVenueAction,
  updateVenueAction,
} from '@/app/actions/venues'
import {
  getOnboardingStatusAction,
  updateOnboardingStatusAction,
  seedDemoDataAction,
} from '@/app/actions/onboarding'
import {
  createTelegramAuthTokenAction,
  getTelegramStatusAction,
  type TelegramConnectionStatus,
  type TelegramAuthTokenResponse,
} from '@/app/actions/telegram'
import {
  connectBankAction,
  syncBankAction,
} from '@/app/actions/bank'
import {
  testIikoConnectionAction,
  saveIikoSettingsAction,
  syncVenueIikoAction,
} from '@/app/actions/iiko'
import { parse1CBankStatement, type ParsedRow } from '@/lib/parsers/1c-bank'
import {
  Building2,
  Database,
  Smartphone,
  PartyPopper,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Sparkles,
  RefreshCw,
  Loader2,
  Landmark,
  Cloud,
  ExternalLink,
  ShieldCheck,
  Check,
  FileText,
  Sliders,
} from 'lucide-react'

export interface OnboardingWizardProps {
  onComplete?: (venueId: string) => void
  onCancel?: () => void
  initialStep?: number
  isModal?: boolean
}

type IngestionTab = 'demo' | 'file' | 'bank' | 'iiko'

export function OnboardingWizard({
  onComplete,
  onCancel,
  initialStep = 1,
  isModal = false,
}: OnboardingWizardProps) {
  const router = useRouter()
  const { venues, selectVenue, addTransactionsBatch, runDeduplication, refreshData } = useApp()

  const [step, setStep] = useState(initialStep)

  // Step 1: Venue Creation
  const [venueName, setVenueName] = useState(() => venues[0]?.name || 'GastroBar Арбат')
  const [venueAddress, setVenueAddress] = useState(() => venues[0]?.address || 'ул. Новый Арбат, 15, Москва')
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [dateTolerance, setDateTolerance] = useState(1)
  const [amountTolerance, setAmountTolerance] = useState(5)
  const [fuzzyThreshold, setFuzzyThreshold] = useState(0.7)
  const [activeVenueId, setActiveVenueId] = useState<string>(() => venues[0]?.id || '')
  const [isCreatingVenue, setIsCreatingVenue] = useState(false)
  const [venueError, setVenueError] = useState<string | null>(null)

  // Restore step from DB / localStorage if initialStep was default
  useEffect(() => {
    if (initialStep === 1) {
      let isMounted = true
      getOnboardingStatusAction()
        .then((status) => {
          if (!isMounted) return
          if (!status.completed && status.step > 1 && status.step <= 4) {
            setStep(status.step)
          }
          if (status.venueId) {
            setActiveVenueId((prev) => prev || status.venueId)
          }
        })
        .catch(() => {})
      return () => {
        isMounted = false
      }
    }
  }, [initialStep])

  // Step 2: Data Ingestion
  const [ingestionTab, setIngestionTab] = useState<IngestionTab>('demo')
  const [isSeedingDemo, setIsSeedingDemo] = useState(false)
  const [demoSeededInfo, setDemoSeededInfo] = useState<{
    txCount: number
    pairsCount: number
    menuCount: number
  } | null>(null)

  // File Upload (.txt 1C)
  const [fileParsing, setFileParsing] = useState(false)
  const [fileParsedCount, setFileParsedCount] = useState<number | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Bank OpenAPI
  const [bankType, setBankType] = useState<'TBANK' | 'TOCHKA'>('TBANK')
  const [bankToken, setBankToken] = useState('tbank_sandbox_token_demo')
  const [bankAccount, setBankAccount] = useState('40702810900000012345')
  const [isBankConnecting, setIsBankConnecting] = useState(false)
  const [bankSuccessMsg, setBankSuccessMsg] = useState<string | null>(null)

  // iikoCloud API
  const [iikoKey, setIikoKey] = useState('demo_restaurant_api_key')
  const [isIikoSyncing, setIsIikoSyncing] = useState(false)
  const [iikoSuccessMsg, setIikoSuccessMsg] = useState<string | null>(null)

  // Step 3: Telegram Bot
  const [tgAuthData, setTgAuthData] = useState<TelegramAuthTokenResponse | null>(null)
  const [tgStatus, setTgStatus] = useState<TelegramConnectionStatus | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingTg = step === 3 && !tgAuthData && !tgStatus?.isConnected

  // Step 4: Final Summary
  const [finalDataSummary, setFinalDataSummary] = useState<string>('Демонстрационный датасет')

  // Sync step changes with server
  const saveProgress = async (newStep: number, completed = false) => {
    try {
      await updateOnboardingStatusAction(newStep, completed)
      localStorage.setItem('finrest_onboarding_step', String(newStep))
      if (completed) {
        localStorage.setItem('finrest_onboarding_completed', 'true')
      }
    } catch {
      // Ignore if unauthenticated
    }
  }

  // --- Step 1 Handler: Create or select venue ---
  const handleProceedStep1 = async () => {
    setVenueError(null)
    if (!venueName.trim()) {
      setVenueError('Укажите название заведения')
      return
    }

    setIsCreatingVenue(true)
    try {
      let venueIdToUse = activeVenueId

      if (!venueIdToUse || !venues.some((v) => v.id === venueIdToUse)) {
        const created = await createVenueAction(
          venueName.trim(),
          venueAddress.trim() || undefined
        )
        venueIdToUse = created.id
        setActiveVenueId(created.id)
      } else {
        await updateVenueAction(venueIdToUse, {
          name: venueName.trim(),
          address: venueAddress.trim() || undefined,
          dateToleranceDays: dateTolerance,
          amountTolerancePercent: amountTolerance,
          fuzzyMatchThreshold: fuzzyThreshold,
        })
      }

      selectVenue(venueIdToUse)
      await refreshData(venueIdToUse)
      await saveProgress(2, false)
      setStep(2)
    } catch (err) {
      setVenueError(err instanceof Error ? err.message : 'Ошибка сохранения заведения')
    } finally {
      setIsCreatingVenue(false)
    }
  }

  // --- Step 2 Handlers: Data Ingestion ---
  const handleSeedDemoData = async () => {
    if (!activeVenueId) return
    setIsSeedingDemo(true)
    try {
      const res = await seedDemoDataAction(activeVenueId)
      if (res.success) {
        setDemoSeededInfo({
          txCount: res.transactionsCount,
          pairsCount: res.deduplicationPairsCount,
          menuCount: res.menuItemsCount,
        })
        setFinalDataSummary(
          `Загружено ${res.transactionsCount} операций, найдено ${res.deduplicationPairsCount} дубликатов`
        )
        await refreshData(activeVenueId)
      }
    } finally {
      setIsSeedingDemo(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeVenueId) return

    setFileParsing(true)
    setFileError(null)
    try {
      const text = await file.text()
      const parsed = parse1CBankStatement(text)
      if (!parsed.success || parsed.rows.length === 0) {
        setFileError('Не удалось распознать операции в файле. Проверьте формат 1CClientBankExchange.')
        return
      }

      const batch = parsed.rows.map((row: ParsedRow) => ({
        venueId: activeVenueId,
        source: 'bank' as const,
        date: row.date,
        amount: row.amount,
        type: row.type,
        category: row.category,
        counterparty: row.counterparty,
        description: row.description,
      }))

      await addTransactionsBatch(batch)
      await runDeduplication()
      await refreshData(activeVenueId)

      setFileParsedCount(parsed.rows.length)
      setFinalDataSummary(`Импортировано ${parsed.rows.length} операций из банковской выписки`)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Ошибка при чтении выписки')
    } finally {
      if (e.target) e.target.value = ''
      setFileParsing(false)
    }
  }

  const handleConnectBank = async () => {
    if (!activeVenueId) return
    setIsBankConnecting(true)
    setBankSuccessMsg(null)
    try {
      await connectBankAction(activeVenueId, {
        bankType,
        token: bankToken,
        accountNumber: bankAccount,
        isSandbox: true,
      })
      const syncRes = await syncBankAction(activeVenueId)
      await refreshData(activeVenueId)
      setBankSuccessMsg(
        `Банк подключен: загружено ${syncRes.syncedCount || 15} операций из песочницы`
      )
      setFinalDataSummary(`Подключен ${bankType === 'TBANK' ? 'Т-Банк' : 'Банк Точка'}`)
    } catch (err) {
      setBankSuccessMsg(err instanceof Error ? err.message : 'Ошибка подключения банка')
    } finally {
      setIsBankConnecting(false)
    }
  }

  const handleConnectIiko = async () => {
    if (!activeVenueId) return
    setIsIikoSyncing(true)
    setIikoSuccessMsg(null)
    try {
      const test = await testIikoConnectionAction(iikoKey)
      if (!test.success) {
        setIikoSuccessMsg(`Ошибка: ${test.error}`)
        return
      }
      const orgId = test.organizations[0]?.id || 'demo-org-1'
      await saveIikoSettingsAction(activeVenueId, { apiKey: iikoKey, orgId, autoSync: true })
      const syncRes = await syncVenueIikoAction(activeVenueId)
      await refreshData(activeVenueId)
      setIikoSuccessMsg(`iiko подключен: +${syncRes.syncedSalesCount} смен, +${syncRes.syncedInventoryCount} блюд`)
      setFinalDataSummary('Синхронизировано с iikoCloud API')
    } catch {
      setIikoSuccessMsg('Сбой при синхронизации с iiko')
    } finally {
      setIsIikoSyncing(false)
    }
  }

  const handleProceedStep2 = async () => {
    // If user clicked continue without choosing, auto-seed demo data so workspace is full
    if (!demoSeededInfo && !fileParsedCount && !bankSuccessMsg && !iikoSuccessMsg && activeVenueId) {
      await handleSeedDemoData()
    }
    await saveProgress(3, false)
    setStep(3)
  }

  // --- Step 3: Telegram bot setup & live polling ---
  useEffect(() => {
    if (step === 3 && activeVenueId) {
      let isMounted = true
      let pollCount = 0
      const maxPolls = 60 // 3 minutes safety timeout

      createTelegramAuthTokenAction(undefined, activeVenueId)
        .then((auth) => {
          if (isMounted) setTgAuthData(auth)
        })

      // Polling every 3 seconds for connection confirmation
      pollingRef.current = setInterval(async () => {
        try {
          pollCount++
          const status = await getTelegramStatusAction()
          if (status.isConnected && isMounted) {
            setTgStatus(status)
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
          } else if (pollCount >= maxPolls && pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        } catch {
          // ignore
        }
      }, 3000)

      return () => {
        isMounted = false
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }
  }, [step, activeVenueId])

  const handleProceedStep3 = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    await saveProgress(4, false)
    setStep(4)
  }

  // --- Step 4: Finalize Onboarding ---
  const handleFinishOnboarding = async () => {
    await saveProgress(4, true)
    await refreshData(activeVenueId)
    if (onComplete) {
      onComplete(activeVenueId)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className={`w-full max-w-3xl mx-auto ${isModal ? 'p-1' : 'p-4 sm:p-6'}`}>
      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {step}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              Шаг {step} из 4:{' '}
              {step === 1 && 'Создание ресторана'}
              {step === 2 && 'Загрузка финансовых данных'}
              {step === 3 && 'Telegram-бот и OCR'}
              {step === 4 && 'Готово к работе!'}
            </span>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Закрыть
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Venue Configuration */}
      {step === 1 && (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Шаг 1: Создание первого заведения
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Укажите название вашего ресторана или бара для раздельного учета и дедупликации
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wizard-venue-name" className="text-xs font-semibold text-slate-700">
                  Название заведения <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="wizard-venue-name"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Например: GastroBar Арбат, Кофейня Зёрна"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wizard-venue-address" className="text-xs font-semibold text-slate-700">
                  Фактический адрес (необязательно)
                </Label>
                <Input
                  id="wizard-venue-address"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="ул. Новый Арбат, 15, Москва"
                  className="h-10 text-sm"
                />
              </div>

              {/* Advanced Deduplication Parameters */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  {showAdvancedSettings ? 'Скрыть параметры дедупликации' : 'Настроить базовые пороги дедупликации'}
                </button>

                {showAdvancedSettings && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Допуск по дате (дней)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={dateTolerance}
                        onChange={(e) => setDateTolerance(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Допуск по сумме (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={amountTolerance}
                        onChange={(e) => setAmountTolerance(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Порог совпадения (0..1)</Label>
                      <Input
                        type="number"
                        step={0.05}
                        min={0}
                        max={1}
                        value={fuzzyThreshold}
                        onChange={(e) => setFuzzyThreshold(parseFloat(e.target.value) || 0.7)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {venueError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {venueError}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                onClick={handleProceedStep1}
                disabled={isCreatingVenue}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 px-6 h-10 text-sm font-semibold"
              >
                {isCreatingVenue ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Продолжить
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Data Ingestion Method */}
      {step === 2 && (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Шаг 2: Способ загрузки данных
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Выберите удобный способ наполнения заведения {venueName}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-medium border-slate-200">
                {venueName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Tabs for Ingestion Method */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setIngestionTab('demo')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  ingestionTab === 'demo'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0 border-0">
                    1 клик
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Демо-датасет</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Готовые данные с дубликатами
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIngestionTab('file')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  ingestionTab === 'file'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="h-4 w-4 text-slate-700" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Выписка .txt</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    1CClientBankExchange
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIngestionTab('bank')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  ingestionTab === 'bank'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Landmark className="h-4 w-4 text-slate-700" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Т-Банк / Точка</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Open Banking API
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIngestionTab('iiko')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  ingestionTab === 'iiko'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Cloud className="h-4 w-4 text-slate-700" />
                <div>
                  <p className="text-xs font-bold text-slate-900">iikoCloud</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Кассовые смены и меню
                  </p>
                </div>
              </button>
            </div>

            {/* Tab 1: Demo Dataset */}
            {ingestionTab === 'demo' && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Мгновенное ознакомление с реальным рестораном
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Автоматически загружает 20+ операций (выручка кассы iiko, эквайринг банка, закупки Мясоторг, Simple Wine, ФОТ и аренда), выявляет пересекающиеся дубликаты и наполняет меню для анализа Food Cost.
                    </p>
                  </div>
                </div>

                {demoSeededInfo ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Данные успешно сформированы!
                    </div>
                    <p className="text-slate-600 pl-5">
                      + {demoSeededInfo.txCount} операций, + {demoSeededInfo.pairsCount} найденных дубликатов, остаток кассы 1 155 000 ₽ и {demoSeededInfo.menuCount} позиций меню.
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleSeedDemoData}
                    disabled={isSeedingDemo}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 gap-1.5"
                  >
                    {isSeedingDemo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Сгенерировать демо-данные в 1 клик
                  </Button>
                )}
              </div>
            )}

            {/* Tab 2: Bank Statement .txt */}
            {ingestionTab === 'file' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Загрузка текстовой выписки 1CClientBankExchange
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Экспортируйте выписку за последний месяц из любого онлайн-банка (Сбер, Альфа, Т-Банк, ВТБ) в формате 1С и выберите файл.
                </p>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs">
                    <UploadCloud className="h-4 w-4 text-emerald-600" />
                    Выбрать .txt файл выписки
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={fileParsing}
                    />
                  </label>
                  {fileParsing && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      Чтение и распознавание...
                    </div>
                  )}
                </div>

                {fileParsedCount !== null && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    Успешно импортировано {fileParsedCount} банковских операций!
                  </div>
                )}

                {fileError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    {fileError}
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Bank API */}
            {ingestionTab === 'bank' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">Банк</Label>
                    <select
                      value={bankType}
                      onChange={(e) => setBankType(e.target.value as 'TBANK' | 'TOCHKA')}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2"
                    >
                      <option value="TBANK">Т-Банк (Тинькофф Бизнес)</option>
                      <option value="TOCHKA">Банк Точка (Open Banking)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">Номер счета</Label>
                    <Input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="40702810..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">API токен доступа</Label>
                  <Input
                    type="password"
                    value={bankToken}
                    onChange={(e) => setBankToken(e.target.value)}
                    placeholder="Токен из личного кабинета"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {bankSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    {bankSuccessMsg}
                  </div>
                )}

                <Button
                  onClick={handleConnectBank}
                  disabled={isBankConnecting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5"
                >
                  {isBankConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Landmark className="h-3.5 w-3.5" />}
                  Подключить и синхронизировать
                </Button>
              </div>
            )}

            {/* Tab 4: iikoCloud */}
            {ingestionTab === 'iiko' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">API Login (iikoCloud)</Label>
                  <Input
                    value={iikoKey}
                    onChange={(e) => setIikoKey(e.target.value)}
                    placeholder="apiLogin или demo_restaurant"
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    Для демо-подключения используйте <code className="bg-slate-200 px-1 py-0.5 rounded">demo_restaurant</code>
                  </p>
                </div>

                {iikoSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    {iikoSuccessMsg}
                  </div>
                )}

                <Button
                  onClick={handleConnectIiko}
                  disabled={isIikoSyncing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5"
                >
                  {isIikoSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
                  Подключить iikoCloud
                </Button>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="gap-1.5 text-xs text-slate-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад
              </Button>
              <Button
                onClick={handleProceedStep2}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 px-6 h-10 text-sm font-semibold"
              >
                Далее: Telegram-бот
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Telegram Bot Connection */}
      {step === 3 && (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Шаг 3: Подключение Telegram-бота
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    OCR чеков шеф-повара и вечерний Flash-отчет в Telegram
                  </p>
                </div>
              </div>
              {tgStatus?.isConnected ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Подключен (@{tgStatus.username || tgStatus.firstName || 'BotUser'})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-800">
                  Ожидание подключения
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingTg ? (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="text-xs text-slate-500">Генерация ключей авторизации Telegram...</p>
              </div>
            ) : tgStatus?.isConnected ? (
              <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    Telegram успешно привязан!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Пользователь: <strong>@{tgStatus.username || tgStatus.firstName}</strong> (ID: {tgStatus.telegramId})
                  </p>
                </div>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Теперь вы и шеф-повар можете фотографировать чеки закупок на рынке, они моментально попадут в дедупликатор FinRest.
                </p>
              </div>
            ) : tgAuthData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {/* Left Column: QR Code */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <QRCode value={tgAuthData.deepLink} size={150} />
                    <p className="text-xs font-semibold text-slate-800 mt-2">
                      Сканируйте камерой смартфона
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Мгновенный переход в диалог с ботом
                    </p>
                  </div>

                  {/* Right Column: Deep-link and PIN */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                      <p className="text-xs font-semibold text-blue-950">
                        Вариант 1: Прямая ссылка в Telegram
                      </p>
                      <a
                        href={tgAuthData.deepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Открыть в Telegram
                      </a>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-800">
                        Вариант 2: Ввести 6-значный PIN-код
                      </p>
                      <p className="text-2xl font-mono font-bold tracking-widest text-blue-700">
                        {tgAuthData.pin.slice(0, 3)}-{tgAuthData.pin.slice(3)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Отправьте этот код сообщением боту <span className="font-semibold text-slate-700">@FinRestBot</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="p-3 rounded-xl bg-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                    </span>
                    <span>Ожидание первого сообщения от бота в реальном времени...</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const st = await getTelegramStatusAction()
                      setTgStatus(st)
                    }}
                    className="text-[11px] h-7 gap-1 text-slate-600 hover:text-slate-900"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Проверить
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="gap-1.5 text-xs text-slate-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад
              </Button>

              <div className="flex items-center gap-2">
                {!tgStatus?.isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleProceedStep3}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Пропустить этот шаг
                  </Button>
                )}
                <Button
                  onClick={handleProceedStep3}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 px-6 h-10 text-sm font-semibold"
                >
                  {tgStatus?.isConnected ? 'Завершить настройку' : 'Продолжить'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Celebration & Workspace Handoff */}
      {step === 4 && (
        <Card className="rounded-2xl border-emerald-200 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-md text-center">
          <CardContent className="p-8 space-y-6">
            <div className="relative inline-block">
              <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <PartyPopper className="h-8 w-8" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Поздравляем! Онбординг успешно завершен
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Ваше финансовое рабочее пространство настроено и готово к ежедневной управленческой аналитике.
              </p>
            </div>

            {/* Checklist of what was configured */}
            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Заведение <strong>{venueName}</strong> создано и установлено активным
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Финансовые данные: <strong>{finalDataSummary}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Telegram-бот:{' '}
                  {tgStatus?.isConnected ? (
                    <strong className="text-emerald-700">Подключен (@{tgStatus.username || 'User'})</strong>
                  ) : (
                    <span>Можно подключить в любой момент в Настройках</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleFinishOnboarding}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold px-8 h-12 gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
              >
                <ShieldCheck className="h-5 w-5" />
                Перейти на Дашборд
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
