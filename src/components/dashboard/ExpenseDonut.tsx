'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_LABELS, CATEGORY_COLORS, type ExpenseCategory, type CategoryBreakdown } from '@/types'

interface ExpenseDonutProps {
  data: CategoryBreakdown[]
}

export function ExpenseDonut({ data }: ExpenseDonutProps) {
  const chartData = data.map(d => ({
    name: CATEGORY_LABELS[d.category] || d.category,
    value: d.amount,
    color: CATEGORY_COLORS[d.category as ExpenseCategory] || '#6B7280',
    percent: d.percent,
  }))

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">
          Структура расходов
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
                formatter={(value, _name, props) => [
                  `${formatCurrency(Number(value))} (${(props.payload as { percent: number }).percent.toFixed(1)}%)`,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
