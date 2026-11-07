'use client'

import React from 'react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number
  trend?: number
  icon: React.ReactNode
  variant?: 'default' | 'profit' | 'loss' | 'savings'
  className?: string
  customValue?: string
  subtitle?: string
  benchmark?: string
  benchmarkStatus?: 'good' | 'warning' | 'alert'
}

export function MetricCard({
  title,
  value,
  trend,
  icon,
  variant = 'default',
  className,
  customValue,
  subtitle,
  benchmark,
  benchmarkStatus,
}: MetricCardProps) {
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  const variantStyles = {
    default: 'bg-white',
    profit: 'bg-emerald-50 border-emerald-200',
    loss: 'bg-red-50 border-red-200',
    savings: 'bg-blue-50 border-blue-200',
  }

  const iconBg = {
    default: 'bg-slate-100 text-slate-700',
    profit: 'bg-emerald-100 text-emerald-700',
    loss: 'bg-red-100 text-red-700',
    savings: 'bg-blue-100 text-blue-700',
  }

  return (
    <Card className={cn('rounded-lg shadow-sm', variantStyles[variant], className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className={cn('text-2xl font-bold tracking-tight font-mono tabular-nums',
              variant === 'profit' ? 'text-emerald-700' :
              variant === 'loss' ? 'text-red-700' :
              'text-slate-900'
            )}>
              {customValue || formatCurrency(value)}
            </p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {isPositive && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                )}
                {isNegative && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                )}
                {!isPositive && !isNegative && (
                  <Minus className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span
                  className={cn(
                    'font-medium font-mono tabular-nums',
                    isPositive && 'text-emerald-700',
                    isNegative && 'text-red-700',
                    !isPositive && !isNegative && 'text-slate-600'
                  )}
                >
                  {formatPercent(trend)}
                </span>
                <span className="text-slate-600 text-xs">к пред. периоду</span>
              </div>
            )}
            {subtitle && (
              <p className="text-xs font-mono tabular-nums text-slate-600">{subtitle}</p>
            )}
            {benchmark && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    benchmarkStatus === 'good'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : benchmarkStatus === 'warning'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : benchmarkStatus === 'alert'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {benchmark}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
              iconBg[variant]
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
