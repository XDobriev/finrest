'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { Building2, Menu, Calendar, LogOut, User as UserIcon, Check, ChevronDown, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getCurrentUserAction, logoutAction } from '@/app/actions/auth'
import type { SessionPayload } from '@/lib/auth/jwt'

interface HeaderProps {
  title: string
  onMenuToggle?: () => void
}

const PRESETS = [
  {
    label: 'Этот месяц',
    getValue: () => {
      const now = new Date()
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      }
    },
  },
  {
    label: 'Прошлый месяц',
    getValue: () => {
      const now = new Date()
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
      }
    },
  },
  {
    label: 'Квартал',
    getValue: () => {
      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3)
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0],
      }
    },
  },
]

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER: { label: 'Владелец', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  MANAGER: { label: 'Управляющий', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ACCOUNTANT: { label: 'Бухгалтер', color: 'bg-purple-100 text-purple-800 border-purple-200' },
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const {
    venues,
    selectedVenueId,
    selectVenue,
    deduplicationPairs,
    dateRange,
    setDateRange,
    toggleMobileMenu,
  } = useApp()
  const pendingPairs = deduplicationPairs.filter((p) => p.status === 'pending').length
  const currentVenue = venues.find((v) => v.id === selectedVenueId)

  const [user, setUser] = useState<SessionPayload | null>(null)
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    getCurrentUserAction().then((u) => {
      if (isMounted) setUser(u)
    })
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    await logoutAction()
    router.push('/login')
    router.refresh()
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
  }

  const roleMeta = user ? ROLE_LABELS[user.role] || { label: user.role, color: 'bg-slate-100 text-slate-800' } : null

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => {
            if (onMenuToggle) {
              onMenuToggle()
            }
            toggleMobileMenu()
          }}
          aria-label="Открыть главное меню"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </Button>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Unified Responsive Venue Selector */}
        {venues.length > 0 ? (
          <Popover open={venueDropdownOpen} onOpenChange={setVenueDropdownOpen}>
            <PopoverTrigger className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium gap-1.5 max-w-[130px] sm:max-w-[210px] md:max-w-[260px] border-slate-200 hover:bg-slate-50 transition-colors"
                aria-label="Выбрать заведение"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{currentVenue?.name || 'Выберите заведение'}</span>
                <ChevronDown className="h-3 w-3 shrink-0 text-slate-400 opacity-70 ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1.5 shadow-md border-slate-200" align="end">
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Заведения
                </div>
                {venues.map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => {
                      selectVenue(venue.id)
                      setVenueDropdownOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center justify-between ${
                      selectedVenueId === venue.id
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-2">{venue.name}</span>
                    {selectedVenueId === venue.id && (
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/venues"
                  onClick={() => setVenueDropdownOpen(false)}
                  className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-md font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Управление заведениями</span>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Link href="/venues">
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs font-medium gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              aria-label="Добавить заведение"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Добавить заведение</span>
              <span className="sm:hidden">Заведение</span>
            </Button>
          </Link>
        )}

        {/* Date range picker */}
        <Popover>
          <PopoverTrigger className="inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs sm:text-sm font-medium h-8 sm:h-9"
              aria-label="Выбрать период дат"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="hidden sm:inline">
                {formatDate(dateRange.from)} — {formatDate(dateRange.to)}
              </span>
              <span className="sm:hidden">
                {formatDate(dateRange.from)}
              </span>
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
                  <label htmlFor="date-range-from" className="text-xs text-slate-600 font-medium">От</label>
                  <Input
                    id="date-range-from"
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="date-range-to" className="text-xs text-slate-600 font-medium">До</label>
                  <Input
                    id="date-range-to"
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


        {/* Quick Tour / Learning link */}
        <Link href="/onboarding" title="Пройти интерактивное обучение">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden lg:inline font-medium">Обучение</span>
          </Button>
        </Link>

        {pendingPairs > 0 && (
          <Badge className="hidden sm:flex gap-1.5 bg-amber-100 text-amber-950 border border-amber-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
            {pendingPairs} дубликатов
          </Badge>
        )}

        {/* User profile & Logout */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {user.name || user.email.split('@')[0]}
              </span>
              <span className="text-xs text-slate-600 font-mono leading-tight">
                {user.email}
              </span>
            </div>
            {roleMeta && (
              <span
                className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${roleMeta.color}`}
              >
                {roleMeta.label}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Выйти из аккаунта"
              aria-label="Выйти из аккаунта"
              className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <UserIcon className="h-3.5 w-3.5" />
              Войти
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}
