'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useApp } from '@/context/AppContext'
import { Settings as SettingsIcon, Sliders, History, User, Shield, Save, Download, Upload, AlertTriangle } from 'lucide-react'

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
  const [settings, setSettings] = useState(venue?.deduplicationSettings || {
    dateToleranceDays: 1,
    amountTolerancePercent: 5,
    fuzzyMatchThreshold: 0.7,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (venue) {
      setSettings(venue.deduplicationSettings)
    }
  }, [venue])

  const handleSave = () => {
    if (selectedVenueId) {
      updateDeduplicationSettings(selectedVenueId, settings)
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
                <p className="font-semibold text-slate-900">Специалист по автоматизации</p>
                <p className="text-sm text-slate-500">admin@finrest.app</p>
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
            <p className="text-xs text-slate-500 mt-1">
              Настройки для заведения: <strong>{venue?.name}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm">
                  Допуск по дате
                  <span className="ml-1 text-xs text-slate-400">(дней)</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={settings.dateToleranceDays}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, dateToleranceDays: parseInt(e.target.value) || 0 }))
                  }
                />
                <p className="text-[11px] text-slate-400">
                  Записи с разницей до ±N дней считаются совпадением
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">
                  Допуск по сумме
                  <span className="ml-1 text-xs text-slate-400">(%)</span>
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
                />
                <p className="text-[11px] text-slate-400">
                  Суммы с разницей до ±N% считаются совпадением
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">
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
                />
                <p className="text-[11px] text-slate-400">
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
                <Badge className="bg-emerald-600">
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
            <p className="text-[11px] text-slate-400">
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
              <p className="text-sm text-slate-500 py-4 text-center">
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
                        <Badge className="bg-emerald-600">Объединение</Badge>
                      )}
                      {entry.action === 'skip' && (
                        <Badge variant="secondary">Пропуск</Badge>
                      )}
                      {entry.action === 'unmerge' && (
                        <Badge variant="secondary">Отмена</Badge>
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        [{entry.transactionIds[0].slice(0, 6)}... — {entry.transactionIds[1].slice(0, 6)}...]
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
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
