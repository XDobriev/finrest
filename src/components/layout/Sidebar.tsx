'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Copy,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  FileText,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChefHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavGroup {
  title?: string
  items: {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Ежедневно',
    items: [
      { href: '/', label: 'Дашборд', icon: LayoutDashboard },
      { href: '/upload', label: 'Загрузка выписок', icon: Upload },
      { href: '/deduplication', label: 'Дедупликация', icon: Copy },
      { href: '/transactions', label: 'Транзакции', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Учёт и отчёты',
    items: [
      { href: '/reports', label: 'Отчёты (ОПиУ / ДДС)', icon: FileText },
      { href: '/inventory', label: 'Инвентаризация', icon: ClipboardList },
      { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
    ],
  },
  {
    title: 'Управление',
    items: [
      { href: '/venues', label: 'Заведения сети', icon: Building2 },
      { href: '/settings', label: 'Настройки и iiko', icon: Settings },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ collapsed, onToggle, onNavigate, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Brand Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 font-bold shadow-sm">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-tight leading-none">FinRest</span>
              <span className="text-xs text-slate-600 font-medium tracking-wider uppercase mt-0.5">HoReCa Finance</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 font-bold shadow-sm"
            aria-label="На главную"
          >
            <ChefHat className="h-5 w-5" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && group.title && (
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-50/80 text-emerald-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      collapsed && 'justify-center px-2 py-2.5'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-emerald-700' : 'text-slate-500')} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )

                if (collapsed) {
                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger render={link} />
                        <TooltipContent side="right" className="font-medium text-xs">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                }

                return <li key={item.href}>{link}</li>
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          className={cn('w-full', collapsed ? 'justify-center px-2' : 'justify-start text-slate-600')}
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs font-medium">Свернуть меню</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
