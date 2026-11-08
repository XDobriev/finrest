'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/context/AppContext'
import {
  Sliders,
  History,
  User,
  Shield,
  Save,
  Download,
  Upload,
  AlertTriangle,
  Cloud,
  RefreshCw,
  Loader2,
  Smartphone,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import {
  testIikoConnectionAction,
  saveIikoSettingsAction,
  syncVenueIikoAction,
} from '@/app/actions/iiko'
import {
  createTelegramAuthTokenAction,
  getTelegramStatusAction,
  disconnectTelegramAction,
  type TelegramConnectionStatus,
  type TelegramAuthTokenResponse,
} from '@/app/actions/telegram'
import {
  getBankConnectionsAction,
  connectBankAction,
  disconnectBankAction,
  syncBankAction,
  testBankAction,
  type BankConnectionDto,
} from '@/app/actions/bank'
import { Landmark } from 'lucide-react'
import type { IikoOrganization } from '@/lib/iiko/types'

export default function SettingsPage() {
  const {
    venues,
    selectedVenueId,
    updateDeduplicationSettings,
    deduplicationLog,
    exportAllData,
    importAllData,
    resetAllData,
  } = useApp()

  const venue = venues.find((v) => v.id === selectedVenueId)
  const [prevVenueId, setPrevVenueId] = useState(venue?.id)
  const [settings, setSettings] = useState(venue?.deduplicationSettings || {
    dateToleranceDays: 1,
    amountTolerancePercent: 5,
    fuzzyMatchThreshold: 0.7,
  })
  const [saved, setSaved] = useState(false)

  // iiko states
  const [iikoApiKey, setIikoApiKey] = useState('demo_restaurant_api_key')
  const [iikoOrgId, setIikoOrgId] = useState('demo-org-1')
  const [iikoOrgs, setIikoOrgs] = useState<IikoOrganization[]>([
    { id: 'demo-org-1', name: 'GastroBar на Арбате' },
    { id: 'demo-org-2', name: 'Кофейня "Зёрна"' },
  ])
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [iikoMessage, setIikoMessage] = useState<string | null>(null)
  const [iikoSaved, setIikoSaved] = useState(false)

  // Telegram Integration states
  const [tgStatus, setTgStatus] = useState<TelegramConnectionStatus | null>(null)
  const [tgAuthData, setTgAuthData] = useState<TelegramAuthTokenResponse | null>(null)
  const [isGeneratingTg, setIsGeneratingTg] = useState(false)

  // Bank Integration states
  const [bankConnections, setBankConnections] = useState<BankConnectionDto[]>([])
  const [selectedBankType, setSelectedBankType] = useState<'TBANK' | 'TOCHKA'>('TBANK')
  const [bankToken, setBankToken] = useState('tbank_sandbox_token_demo')
  const [bankAccountNumber, setBankAccountNumber] = useState('40702810900000012345')
  const [isBankSandbox, setIsBankSandbox] = useState(true)
  const [isBankConnecting, setIsBankConnecting] = useState(false)
  const [isBankTesting, setIsBankTesting] = useState(false)
  const [isBankSyncingId, setIsBankSyncingId] = useState<string | null>(null)
  const [bankMessage, setBankMessage] = useState<string | null>(null)

  const loadBankConnections = React.useCallback(async (venueId: string) => {
    try {
      const conns = await getBankConnectionsAction(venueId)
      setBankConnections(conns)
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    getTelegramStatusAction().then((st) => {
      if (isMounted) setTgStatus(st)
    }).catch(() => {})

    if (selectedVenueId) {
      getBankConnectionsAction(selectedVenueId).then((conns) => {
        if (isMounted) setBankConnections(conns)
      }).catch(() => {})
    }

    return () => {
      isMounted = false
    }
  }, [selectedVenueId])

  const handleConnectTelegram = async () => {
    setIsGeneratingTg(true)
    try {
      const data = await createTelegramAuthTokenAction(undefined, selectedVenueId)
      setTgAuthData(data)
    } finally {
      setIsGeneratingTg(false)
    }
  }

  const handleDisconnectTelegram = async () => {
    await disconnectTelegramAction()
    setTgStatus({ isConnected: false })
    setTgAuthData(null)
  }

  const handleTestBank = async () => {
    setIsBankTesting(true)
    setBankMessage(null)
    try {
      const res = await testBankAction(selectedBankType, bankToken, isBankSandbox)
      setBankMessage(res.message)
    } finally {
      setIsBankTesting(false)
    }
  }

  const handleSaveBankConnection = async () => {
    if (!selectedVenueId) return
    setIsBankConnecting(true)
    setBankMessage(null)
    try {
      await connectBankAction(selectedVenueId, {
        bankType: selectedBankType,
        token: bankToken,
        accountNumber: bankAccountNumber,
        isSandbox: isBankSandbox,
      })
      await loadBankConnections(selectedVenueId)
      setBankMessage('Банк успешно подключен и готов к синхронизации')
    } catch (err) {
      setBankMessage(err instanceof Error ? err.message : 'Ошибка подключения банка')
    } finally {
      setIsBankConnecting(false)
    }
  }

  const handleSyncBank = async (connectionId: string) => {
    if (!selectedVenueId) return
    setIsBankSyncingId(connectionId)
    setBankMessage(null)
    try {
      const res = await syncBankAction(connectionId)
      if (res.success) {
        setBankMessage(`Синхронизировано ${res.syncedCount} банковских операций, найдено дубликатов: ${res.newDuplicatesCount}`)
      } else {
        setBankMessage(res.error || 'Ошибка синхронизации')
      }
      await loadBankConnections(selectedVenueId)
    } catch (err) {
      setBankMessage(err instanceof Error ? err.message : 'Ошибка выполнения синхронизации')
    } finally {
      setIsBankSyncingId(null)
    }
  }

  const handleDisconnectBank = async (connectionId: string) => {
    if (!selectedVenueId) return
    await disconnectBankAction(connectionId)
    await loadBankConnections(selectedVenueId)
    setBankMessage('Банк отключен')
  }

  if (venue && venue.id !== prevVenueId) {
    setPrevVenueId(venue.id)
    setSettings(venue.deduplicationSettings)
  }

  const handleTestIiko = async () => {
    setIsTesting(true)
    setIikoMessage(null)
    try {
      const res = await testIikoConnectionAction(iikoApiKey)
      if (res.success) {
        setIikoOrgs(res.organizations)
        if (res.organizations.length > 0) {
          setIikoOrgId(res.organizations[0].id)
        }
        setIikoMessage(`✓ Подключение успешно. Найдено организаций: ${res.organizations.length}`)
      } else {
        setIikoMessage(`Ошибка: ${res.error}`)
      }
    } catch {
      setIikoMessage('Не удалось подключиться к iikoCloud')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveIiko = async () => {
    if (!selectedVenueId) return
    const res = await saveIikoSettingsAction(selectedVenueId, {
      apiKey: iikoApiKey,
      orgId: iikoOrgId,
      autoSync: true,
    })
    if (res.success) {
      setIikoSaved(true)
      setTimeout(() => setIikoSaved(false), 2000)
    }
  }

  const handleSyncNow = async () => {
    if (!selectedVenueId) return
    setIsSyncing(true)
    setIikoMessage(null)
    try {
      const res = await syncVenueIikoAction(selectedVenueId)
      if (res.success) {
        setIikoMessage(
          `✓ Синхронизация завершена: +${res.syncedSalesCount} смен, +${res.syncedInventoryCount} позиций номенклатуры, ${res.newDuplicatesCount} пар для дедупликации`
        )
      } else {
        setIikoMessage(`Ошибка синхронизации: ${res.error}`)
      }
    } catch {
      setIikoMessage('Сбой при синхронизации данных')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = async () => {
    if (selectedVenueId) {
      await updateDeduplicationSettings(selectedVenueId, settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const venueLog = deduplicationLog
    .filter((entry) => entry.venueId === selectedVenueId)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())

  return (
    <div>
      <Header title="Настройки" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Profile */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Профиль
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Управляющий партнёр</p>
                <p className="text-sm text-slate-600 font-mono">admin@finrest.ru</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* iikoCloud Integration */}
        <Card className="rounded-lg shadow-sm border-emerald-200/80 bg-gradient-to-b from-emerald-50/20 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Интеграция с iikoCloud
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50">
                {venue?.name}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Автоматическая синхронизация кассовых смен, выручки и остатков блюд по iiko API
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">API Login (iikoCloud)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="apiLogin или demo_..."
                    value={iikoApiKey}
                    onChange={(e) => setIikoApiKey(e.target.value)}
                    className="text-xs font-mono h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestIiko}
                    disabled={isTesting}
                    className="shrink-0 text-xs gap-1.5 h-9"
                  >
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Проверить
                  </Button>
                </div>
                <p className="text-xs text-slate-600">
                  Для тестовой среды введите <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">demo_restaurant</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Организация в iiko</Label>
                <Select value={iikoOrgId} onValueChange={(val) => setIikoOrgId(val || '')}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Выберите ресторан" />
                  </SelectTrigger>
                  <SelectContent>
                    {iikoOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600">
                  ID: <span className="font-mono">{iikoOrgId}</span>
                </p>
              </div>
            </div>

            {iikoMessage && (
              <div className="p-3 text-xs rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium">
                {iikoMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveIiko}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Сохранить ключ
                </Button>
                {iikoSaved && (
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
                    ✓ Сохранено
                  </Badge>
                )}
              </div>

              <Button
                onClick={handleSyncNow}
                disabled={isSyncing}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
              >
                {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Синхронизировать сейчас
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Bot Integration */}
        <Card className="rounded-lg shadow-sm border-blue-200/80 bg-gradient-to-b from-blue-50/20 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Telegram-бот и OCR чеков
                </CardTitle>
              </div>
              {tgStatus?.isConnected ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Подключен (@{tgStatus.username || tgStatus.firstName || 'User'})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                  Не подключен
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Моментальный ввод расходов шеф-поваром, двухступенчатый OCR чеков (54-ФЗ и рынок) и вечерний Flash-отчет в 23:30.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tgStatus?.isConnected ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex-wrap gap-3">
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-emerald-950">
                    Бот активен для заведения: {tgStatus.activeVenueName || venue?.name}
                  </p>
                  <p className="text-emerald-800">
                    Telegram ID: <span className="font-mono">{tgStatus.telegramId}</span>
                  </p>
                </div>
                <Button
                  onClick={handleDisconnectTelegram}
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8"
                >
                  Отключить аккаунт
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!tgAuthData ? (
                  <div>
                    <Button
                      onClick={handleConnectTelegram}
                      disabled={isGeneratingTg}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 h-9"
                    >
                      {isGeneratingTg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                      Подключить Telegram
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 space-y-3">
                    <p className="text-xs font-semibold text-blue-950">
                      Для подключения Telegram выберите один из вариантов:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-md border border-blue-100 space-y-2">
                        <p className="font-medium text-slate-900">Вариант 1: Прямая ссылка</p>
                        <a
                          href={tgAuthData.deepLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Перейти в @FinRestBot
                        </a>
                      </div>

                      <div className="p-3 bg-white rounded-md border border-blue-100 space-y-1.5">
                        <p className="font-medium text-slate-900">Вариант 2: 6-значный PIN-код</p>
                        <p className="text-lg font-mono font-bold tracking-widest text-blue-700">
                          {tgAuthData.pin.slice(0, 3)}-{tgAuthData.pin.slice(3)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Отправьте этот код боту в чат. Код действует 10 минут.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Integrations (Phase 7: T-Bank & Tochka Open API) */}
        <Card className="rounded-lg shadow-sm border border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Банковские интеграции (Open API)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Автоматический забор утренней выписки в 06:00 и матчинг с iiko без ручного экспорта
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-normal border-emerald-300 bg-emerald-50 text-emerald-800">
                Фаза 7
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connected Banks List */}
            {bankConnections.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Подключенные счета заведения
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bankConnections.map((conn) => {
                    const isConnected = conn.status === 'connected'
                    const isSyncing = isBankSyncingId === conn.id
                    return (
                      <div
                        key={conn.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">
                                {conn.bankType === 'TBANK' ? 'Т-Банк (Тинькофф)' : 'Банк Точка'}
                              </span>
                              {conn.isSandbox && (
                                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                                  Sandbox
                                </Badge>
                              )}
                              <Badge
                                variant={isConnected ? 'default' : 'destructive'}
                                className={`text-[10px] ${
                                  isConnected ? 'bg-emerald-600' : 'bg-red-600'
                                }`}
                              >
                                {isConnected ? 'Активен' : 'Отключен'}
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-slate-600 mt-1">
                              Счет: {conn.accountNumber || 'Основной расчетный счет'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {conn.lastSyncAt
                                ? `Посл. синхр: ${new Date(conn.lastSyncAt).toLocaleString('ru-RU')}`
                                : 'Ожидает первой синхронизации'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncBank(conn.id)}
                            disabled={isSyncing || !isConnected}
                            className="text-xs h-8 gap-1.5"
                          >
                            {isSyncing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Синхронизировать
                          </Button>
                          {isConnected ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDisconnectBank(conn.id)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 ml-auto"
                            >
                              Отключить
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveBankConnection()}
                              className="text-xs text-emerald-600 hover:text-emerald-700 h-8 ml-auto"
                            >
                              Подключить заново
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Form to Connect New Bank or Update */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Подключение интернет-банка
                </Label>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="bank-sandbox-toggle"
                    checked={isBankSandbox}
                    onChange={(e) => setIsBankSandbox(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="bank-sandbox-toggle" className="cursor-pointer">
                    Песочница / Mock-режим
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700">Банк</Label>
                  <Select
                    value={selectedBankType}
                    onValueChange={(val) => setSelectedBankType(val as 'TBANK' | 'TOCHKA')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Выберите банк" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TBANK">Т-Банк (Тинькофф Бизнес)</SelectItem>
                      <SelectItem value="TOCHKA">Банк Точка (Open Banking)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700">Номер расчетного счета</Label>
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="40702810..."
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700">API токен доступа</Label>
                  <Input
                    type="password"
                    value={bankToken}
                    onChange={(e) => setBankToken(e.target.value)}
                    placeholder="Токен из личного кабинета банка"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {bankMessage && (
                <div className="p-2.5 rounded bg-white border border-slate-200 text-xs text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{bankMessage}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestBank}
                  disabled={isBankTesting}
                  className="text-xs h-9 gap-1.5"
                >
                  {isBankTesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Проверить токен
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveBankConnection}
                  disabled={isBankConnecting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 gap-1.5"
                >
                  {isBankConnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Сохранить и подключить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deduplication Settings */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Пороги дедупликации
              </CardTitle>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Настройки для заведения: <strong>{venue?.name}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm text-slate-800">
                  Допуск по дате
                  <span className="ml-1 text-xs text-slate-600">(дней)</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={settings.dateToleranceDays}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, dateToleranceDays: parseInt(e.target.value) || 0 }))
                  }
                  aria-label="Допуск по дате в днях"
                />
                <p className="text-xs text-slate-600">
                  Записи с разницей до ±N дней считаются совпадением
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-800">
                  Допуск по сумме
                  <span className="ml-1 text-xs text-slate-600">(%)</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.amountTolerancePercent}
                  onChange={(e) =>
                    setSettings((s) => ({
                       ...s,
                      amountTolerancePercent: parseInt(e.target.value) || 0,
                    }))
                  }
                  aria-label="Допуск по сумме в процентах"
                />
                <p className="text-xs text-slate-600">
                  Суммы с разницей до ±N% считаются совпадением
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-800">
                  Порог нечёткого совпадения
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.fuzzyMatchThreshold}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      fuzzyMatchThreshold: parseFloat(e.target.value) || 0,
                    }))
                  }
                  aria-label="Порог нечёткого совпадения"
                />
                <p className="text-xs text-slate-600">
                  От 0 (строгое) до 1 (мягкое) сравнение названий
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
              {saved && (
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="animate-pulse">✓</span> Сохранено
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Формат данных
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Валюта</Label>
                <Input value="Российский рубль (₽)" readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Формат чисел</Label>
                <Input value="1 234 567,89 ₽" readOnly className="bg-slate-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Управление данными
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const json = exportAllData()
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `finrest_backup_${new Date().toISOString().split('T')[0]}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4" />
                Экспортировать данные
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.json'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const success = importAllData(reader.result as string)
                      if (success) {
                        alert('Данные успешно импортированы')
                      } else {
                        alert('Ошибка: неверный формат файла')
                      }
                    }
                    reader.readAsText(file)
                  }
                  input.click()
                }}
              >
                <Upload className="h-4 w-4" />
                Импортировать данные
              </Button>

              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm('Все данные будут удалены и заменены демо-данными. Продолжить?')) {
                    resetAllData()
                  }
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                Сбросить все данные
              </Button>
            </div>
            <p className="text-xs text-slate-600">
              Экспорт сохраняет все данные (транзакции, заведения, инвентаризацию, настройки) в JSON-файл.
            </p>
          </CardContent>
        </Card>

        {/* Deduplication Log */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Лог изменений дедупликации
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {venueLog.length === 0 ? (
              <p className="text-sm text-slate-600 py-4 text-center">
                Нет записей в логе. Запустите дедупликацию для начала работы.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {venueLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      {entry.action === 'merge' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">Объединение</Badge>
                      )}
                      {entry.action === 'skip' && (
                        <Badge variant="secondary">Пропуск</Badge>
                      )}
                      {entry.action === 'unmerge' && (
                        <Badge variant="secondary">Отмена</Badge>
                      )}
                      <span className="text-xs text-slate-600 font-mono tabular-nums">
                        [{entry.transactionIds[0].slice(0, 6)}... — {entry.transactionIds[1].slice(0, 6)}...]
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 font-mono tabular-nums">
                      {new Date(entry.performedAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
