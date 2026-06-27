'use client'

import React from 'react'
import { useApp } from '@/context/AppContext'
import { Building2, Menu, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface HeaderProps {
  title: string
  onMenuToggle: () => void
}

const PRESETS = [
  { label: 'Этот месяц', getValue: () => {
    const now = new Date()
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    }
  }},
  { label: 'Прошлый месяц', getValue: () => {
    const now = new Date()
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
    }
  }},
  { label: 'Квартал', getValue: () => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3)
    return {
      from: new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0],
      to: new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0],
    }
  }},
]

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { venues, selectedVenueId, selectVenue, deduplicationPairs, dateRange, setDateRange } = useApp()
  const pendingPairs = deduplicationPairs.filter(p => p.status === 'pending').length

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Date range picker */}
        <Popover>
          <PopoverTrigger className="inline-flex">
            <Button variant="outline" size="sm" className="gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{formatDate(dateRange.from)} — {formatDate(dateRange.to)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-3">
              <div className="flex gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setDateRange(preset.getValue())}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">От</label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">До</label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Venue selector */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-slate-50 p-1">
          {venues.map((venue) => (
            <button
              key={venue.id}
              onClick={() => selectVenue(venue.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedVenueId === venue.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{venue.name}</span>
              <span className="md:hidden">{venue.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {pendingPairs > 0 && (
          <Badge variant="destructive" className="hidden sm:flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {pendingPairs} дубликатов
          </Badge>
        )}
      </div>
    </header>
  )
}
