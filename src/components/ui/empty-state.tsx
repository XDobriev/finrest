'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  tip?: string
  checklist?: string[]
  actions?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  tip,
  checklist,
  actions,
  className = '',
}: EmptyStateProps) {
  return (
    <Card className={`rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 shadow-xs text-center ${className}`}>
      <CardContent className="p-8 sm:p-12 max-w-xl mx-auto space-y-5">
        {/* Icon */}
        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center mx-auto text-emerald-600">
          {icon}
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Checklist */}
        {checklist && checklist.length > 0 && (
          <div className="text-left bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
              Что нужно сделать:
            </span>
            <ul className="space-y-1.5 text-slate-600">
              {checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Educational Tip */}
        {tip && (
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-left flex items-start gap-2.5 text-xs text-amber-900">
            <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold">Подсказка для ресторатора: </span>
              <span>{tip}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {actions && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
