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

  React.useEffect(() => {
    getTelegramStatusAction().then(setTgStatus).catch(() => {})
  }, [])

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
