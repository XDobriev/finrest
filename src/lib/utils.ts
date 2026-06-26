import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ₽`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K ₽`
  }
  return `${amount.toFixed(0)} ₽`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    iiko: '#3B82F6',
    bank: '#10B981',
    admin: '#F59E0B',
    manual: '#8B5CF6',
  }
  return colors[source] || '#6B7280'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    unique: '#10B981',
    duplicate: '#EF4444',
    pending_review: '#F59E0B',
  }
  return colors[status] || '#6B7280'
}
