'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useApp } from '@/context/AppContext'
import {
  getMenuAnalysisAction,
  saveMenuItemAction,
  seedDefaultMenuAction,
  type MenuAnalysisResult,
} from '@/app/actions/menu'
import {
  UtensilsCrossed,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Plus,
  RefreshCw,
  Loader2,
  PieChart,
  ShieldAlert,
} from 'lucide-react'

export default function MenuAnalyticsPage() {
  const { selectedVenueId, venues } = useApp()
  const venue = venues.find((v) => v.id === selectedVenueId)

  const [period, setPeriod] = useState('2026-11')
  const [analysis, setAnalysis] = useState<MenuAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  // New item modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('kitchen')
  const [newItemPrice, setNewItemPrice] = useState('650')
  const [newItemStdCost, setNewItemStdCost] = useState('180')
  const [newItemActCost, setNewItemActCost] = useState('195')
  const [newItemVolume, setNewItemVolume] = useState('150')
  const [isSaving, setIsSaving] = useState(false)

  const loadAnalysis = React.useCallback(async (venueId: string, currentPeriod: string) => {
    setIsLoading(true)
    try {
      const data = await getMenuAnalysisAction(venueId, currentPeriod)
      setAnalysis(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    if (selectedVenueId) {
      getMenuAnalysisAction(selectedVenueId, period).then((data) => {
        if (isMounted) {
          setAnalysis(data)
          setIsLoading(false)
        }
      }).catch(() => {
        if (isMounted) setIsLoading(false)
      })
    }
    return () => {
      isMounted = false
    }
  }, [selectedVenueId, period])

  const handleSeedMenu = async () => {
    if (!selectedVenueId) return
    setIsLoading(true)
    try {
      await seedDefaultMenuAction(selectedVenueId, period)
      await loadAnalysis(selectedVenueId, period)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveItem = async () => {
    if (!selectedVenueId || !newItemName) return
    setIsSaving(true)
    try {
      await saveMenuItemAction(selectedVenueId, {
        name: newItemName,
        category: newItemCategory,
        sellingPrice: parseFloat(newItemPrice) || 0,
        standardCost: parseFloat(newItemStdCost) || 0,
        actualCost: parseFloat(newItemActCost) || 0,
        salesVolume: parseFloat(newItemVolume) || 0,
        period,
      })
      setIsDialogOpen(false)
      setNewItemName('')
      await loadAnalysis(selectedVenueId, period)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredItems = useMemo(() => {
    if (!analysis) return []
    if (selectedFilter === 'all') return analysis.items
    if (selectedFilter === 'star') return analysis.items.filter((i) => i.matrixCategory === 'star')
    if (selectedFilter === 'plowhorse') return analysis.items.filter((i) => i.matrixCategory === 'plowhorse')
    if (selectedFilter === 'puzzle') return analysis.items.filter((i) => i.matrixCategory === 'puzzle')
    if (selectedFilter === 'dog') return analysis.items.filter((i) => i.matrixCategory === 'dog')
    if (selectedFilter === 'critical') return analysis.items.filter((i) => i.varianceStatus === 'CRITICAL')
    return analysis.items
  }, [analysis, selectedFilter])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header title="Инженерия меню и Фудкост" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/analytics"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
              >
                <PieChart className="h-3.5 w-3.5" />
                Общая аналитика
              </Link>
              <span className="text-slate-400 text-xs">/</span>
              <span className="text-xs font-semibold text-emerald-800">
                Матрица Касаваны-Смита & Фудкост
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-emerald-600" />
              Инженерия меню и Food Cost Engine
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Анализ маржинальности блюд, выявление скрытых потерь и рекомендации ресторатору ({venue?.name || 'Заведение'})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Select value={period} onValueChange={(val) => val && setPeriod(val)}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-white">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-11">Ноябрь 2026</SelectItem>
                <SelectItem value="2026-10">Октябрь 2026</SelectItem>
                <SelectItem value="2026-09">Сентябрь 2026</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSeedMenu}
              disabled={isLoading}
              className="text-xs h-9 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Обновить меню
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer">
                <Plus className="h-3.5 w-3.5" />
                Добавить блюдо
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">Добавить блюдо в меню</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <Label className="text-xs">Название позиции</Label>
                    <Input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Например: Салат с баклажанами"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Категория</Label>
                      <Select value={newItemCategory} onValueChange={(val) => val && setNewItemCategory(val)}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen">Кухня</SelectItem>
                          <SelectItem value="bar">Бар</SelectItem>
                          <SelectItem value="dessert">Десерты</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Цена продажи (₽)</Label>
                      <Input
                        type="number"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Норма с/с (₽)</Label>
                      <Input
                        type="number"
                        value={newItemStdCost}
                        onChange={(e) => setNewItemStdCost(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Факт с/с (₽)</Label>
                      <Input
                        type="number"
                        value={newItemActCost}
                        onChange={(e) => setNewItemActCost(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Продажи (порций)</Label>
                      <Input
                        type="number"
                        value={newItemVolume}
                        onChange={(e) => setNewItemVolume(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveItem}
                    disabled={isSaving || !newItemName}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 mt-2"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Сохранить позицию'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <span className="text-sm">Выполняется расчет матрицы Касаваны-Смита и фудкоста...</span>
          </div>
        )}

        {/* Summary Metric Cards */}
        {!isLoading && analysis && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-lg shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <span className="text-xs text-slate-500 font-medium">Выручка по меню</span>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    {analysis.summary.totalRevenue.toLocaleString('ru-RU')} ₽
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-600">
                    Всего {analysis.summary.totalMenuItems} блюд в меню за месяц
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-lg shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <span className="text-xs text-slate-500 font-medium">Нормативный Food Cost</span>
                  <CardTitle className="text-xl font-bold text-emerald-700">
                    {analysis.summary.overallStandardFoodCostPercent}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-600">
                    По калькуляционным картам: {analysis.summary.totalStandardFoodCost.toLocaleString('ru-RU')} ₽
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-lg shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <span className="text-xs text-slate-500 font-medium">Фактический Food Cost</span>
                  <CardTitle className="text-xl font-bold text-amber-700">
                    {analysis.summary.overallActualFoodCostPercent}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-600">
                    По факту расхода: {analysis.summary.totalActualFoodCost.toLocaleString('ru-RU')} ₽
                  </p>
                </CardContent>
              </Card>

              <Card className={`rounded-lg shadow-sm border ${
                analysis.summary.totalFoodCostLoss > 0
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-slate-200'
              }`}>
                <CardHeader className="pb-2">
                  <span className="text-xs text-red-700 font-medium flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Потери от перерасхода
                  </span>
                  <CardTitle className="text-xl font-bold text-red-700">
                    -{analysis.summary.totalFoodCostLoss.toLocaleString('ru-RU')} ₽
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-red-600">
                    {analysis.summary.criticalVariancesCount} блюд с критическим отклонением
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Kasavana-Smith Matrix 4 Quadrants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Матрица меню Касаваны-Смита (Kasavana & Smith)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Классификация позиций по маржинальному доходу (₽) и популярности у гостей
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Stars (Звёзды) */}
                <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-900">
                        <span>⭐️</span> Звёзды (Stars)
                      </div>
                      <Badge className="bg-emerald-600 text-white text-xs">
                        {analysis.summary.starsCount} блюд
                      </Badge>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Высокая маржа + Высокий спрос. Драйверы чистой прибыли.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {analysis.items
                      .filter((i) => i.matrixCategory === 'star')
                      .map((item) => (
                        <div
                          key={item.id || item.name}
                          className="flex items-center justify-between p-2 rounded bg-white border border-emerald-100 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            <span className="text-slate-500 ml-2">({item.salesVolume} шт.)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-medium text-emerald-700">
                              +{item.margin.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              FC {item.actualFoodCostPercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {/* 2. Plowhorses (Рабочие лошадки) */}
                <Card className="border-blue-200 bg-blue-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-blue-900">
                        <span>🐎</span> Рабочие лошадки (Plowhorses)
                      </div>
                      <Badge className="bg-blue-600 text-white text-xs">
                        {analysis.summary.plowhorsesCount} блюд
                      </Badge>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Низкая маржа + Высокий спрос. Кандидаты на рост цены на 5-10% или оптимизацию рецепта.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {analysis.items
                      .filter((i) => i.matrixCategory === 'plowhorse')
                      .map((item) => (
                        <div
                          key={item.id || item.name}
                          className="flex items-center justify-between p-2 rounded bg-white border border-blue-100 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            <span className="text-slate-500 ml-2">({item.salesVolume} шт.)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-medium text-blue-700">
                              +{item.margin.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              FC {item.actualFoodCostPercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {/* 3. Puzzles (Загадки) */}
                <Card className="border-purple-200 bg-purple-50/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-purple-900">
                        <span>❓</span> Загадки (Puzzles)
                      </div>
                      <Badge className="bg-purple-600 text-white text-xs">
                        {analysis.summary.puzzlesCount} блюд
                      </Badge>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      Высокая маржа + Низкий спрос. Нуждаются в активном продвижении официантами.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {analysis.items
                      .filter((i) => i.matrixCategory === 'puzzle')
                      .map((item) => (
                        <div
                          key={item.id || item.name}
                          className="flex items-center justify-between p-2 rounded bg-white border border-purple-100 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            <span className="text-slate-500 ml-2">({item.salesVolume} шт.)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-medium text-purple-700">
                              +{item.margin.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              FC {item.actualFoodCostPercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {/* 4. Dogs (Собаки) */}
                <Card className="border-slate-300 bg-slate-100/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-slate-700">
                        <span>🐕</span> Собаки (Dogs)
                      </div>
                      <Badge variant="outline" className="text-slate-600 text-xs">
                        {analysis.summary.dogsCount} блюд
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Низкая маржа + Низкий спрос. Кандидаты на вывод из меню.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {analysis.items
                      .filter((i) => i.matrixCategory === 'dog')
                      .map((item) => (
                        <div
                          key={item.id || item.name}
                          className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            <span className="text-slate-500 ml-2">({item.salesVolume} шт.)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-medium text-slate-600">
                              +{item.margin.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              FC {item.actualFoodCostPercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Actionable Recommendations */}
            {analysis.summary.recommendations.length > 0 && (
              <Card className="rounded-lg shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Управленческие рекомендации для ресторатора и шеф-повара
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.summary.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                        rec.priority === 'high'
                          ? 'border-red-200 bg-red-50/70 text-red-950'
                          : rec.priority === 'medium'
                          ? 'border-amber-200 bg-amber-50/70 text-amber-950'
                          : 'border-slate-200 bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1.5">
                          {rec.priority === 'high' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          {rec.title}
                        </span>
                        <Badge
                          variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {rec.priority === 'high' ? 'Срочно' : 'Рекомендация'}
                        </Badge>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-700">
                        {rec.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Detailed Menu Engineering Table */}
            <Card className="rounded-lg shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Детализированный реестр блюд (ABC/XYZ & Food Cost)
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Полный анализ структуры себестоимости и маржи по всем позициям меню
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant={selectedFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setSelectedFilter('all')}
                      className="text-xs h-7 px-2.5"
                    >
                      Все ({analysis.items.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFilter === 'star' ? 'default' : 'outline'}
                      onClick={() => setSelectedFilter('star')}
                      className="text-xs h-7 px-2.5 text-emerald-700"
                    >
                      Звёзды ({analysis.summary.starsCount})
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFilter === 'plowhorse' ? 'default' : 'outline'}
                      onClick={() => setSelectedFilter('plowhorse')}
                      className="text-xs h-7 px-2.5 text-blue-700"
                    >
                      Лошадки ({analysis.summary.plowhorsesCount})
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFilter === 'puzzle' ? 'default' : 'outline'}
                      onClick={() => setSelectedFilter('puzzle')}
                      className="text-xs h-7 px-2.5 text-purple-700"
                    >
                      Загадки ({analysis.summary.puzzlesCount})
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFilter === 'critical' ? 'default' : 'outline'}
                      onClick={() => setSelectedFilter('critical')}
                      className="text-xs h-7 px-2.5 text-red-700"
                    >
                      Перерасход ({analysis.summary.criticalVariancesCount})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 border-y border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Блюдо</th>
                      <th className="py-2.5 px-2">Категория</th>
                      <th className="py-2.5 px-2 text-right">Цена</th>
                      <th className="py-2.5 px-2 text-right">Норма с/с</th>
                      <th className="py-2.5 px-2 text-right">Факт с/с</th>
                      <th className="py-2.5 px-2 text-right">Отклонение</th>
                      <th className="py-2.5 px-2 text-right">Продажи</th>
                      <th className="py-2.5 px-2 text-right">Выручка</th>
                      <th className="py-2.5 px-2 text-right">Маржа</th>
                      <th className="py-2.5 px-3 text-center">Матрица</th>
                      <th className="py-2.5 px-2 text-center">ABC/XYZ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredItems.map((item) => {
                      const isCritical = item.varianceStatus === 'CRITICAL'
                      const isWarning = item.varianceStatus === 'WARNING'
                      return (
                        <tr
                          key={item.id || item.name}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500">
                            {item.category === 'kitchen' ? 'Кухня' : item.category === 'bar' ? 'Бар' : 'Десерт'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">
                            {item.sellingPrice.toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                            {item.standardCost.toLocaleString('ru-RU')} ₽
                            <span className="text-[10px] text-slate-400 block font-sans">
                              ({item.standardFoodCostPercent}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-medium">
                            {item.actualCost.toLocaleString('ru-RU')} ₽
                            <span className="text-[10px] text-slate-500 block font-sans">
                              ({item.actualFoodCostPercent}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">
                            <span
                              className={`font-semibold ${
                                isCritical
                                  ? 'text-red-600'
                                  : isWarning
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {item.variancePercent > 0 ? `+${item.variancePercent}%` : `${item.variancePercent}%`}
                            </span>
                            {item.varianceAmount !== 0 && (
                              <span className="text-[10px] text-slate-500 block font-mono">
                                {item.varianceAmount > 0
                                  ? `+${item.varianceAmount.toLocaleString('ru-RU')} ₽`
                                  : `${item.varianceAmount.toLocaleString('ru-RU')} ₽`}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">
                            {item.salesVolume} шт
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-medium">
                            {item.totalRevenue.toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-emerald-700 font-semibold">
                            +{item.margin.toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                item.matrixCategory === 'star'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : item.matrixCategory === 'plowhorse'
                                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                                  : item.matrixCategory === 'puzzle'
                                  ? 'border-purple-300 bg-purple-50 text-purple-800'
                                  : 'border-slate-300 bg-slate-50 text-slate-600'
                              }`}
                            >
                              {item.matrixCategory === 'star'
                                ? '⭐️ Звезда'
                                : item.matrixCategory === 'plowhorse'
                                ? '🐎 Лошадка'
                                : item.matrixCategory === 'puzzle'
                                ? '❓ Загадка'
                                : '🐕 Собака'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            <Badge variant="secondary" className="text-[10px] mr-1">
                              {item.abcCategory}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {item.xyzCategory}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
