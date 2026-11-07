import type { ExpenseCategory } from '@/types'

export interface IikoAuthConfig {
  apiLogin: string
  baseUrl?: string
}

export interface IikoOrganization {
  id: string
  name: string
  address?: string
}

export interface IikoProduct {
  id: string
  name: string
  code?: string
  category: ExpenseCategory
  unit: string
  pricePerUnit: number
}

export interface IikoDailyShift {
  date: string
  amount: number
  type: 'income'
  source: 'iiko'
  counterparty: string
  description: string
}

export interface IikoSyncResult {
  success: boolean
  venueId: string
  syncedSalesCount: number
  syncedInventoryCount: number
  newDuplicatesCount: number
  error?: string
}
