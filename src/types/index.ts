export type DataSource = 'iiko' | 'bank' | 'admin' | 'manual'

export type ExpenseCategory =
  | 'food'
  | 'bar'
  | 'household'
  | 'services'
  | 'salary'
  | 'rent'
  | 'utilities'
  | 'marketing'
  | 'other'

export type TransactionStatus = 'unique' | 'duplicate' | 'pending_review'

export interface Venue {
  id: string
  name: string
  address?: string
  createdAt: string
  deduplicationSettings: DeduplicationSettings
}

export interface DeduplicationSettings {
  dateToleranceDays: number
  amountTolerancePercent: number
  fuzzyMatchThreshold: number
}

export interface Transaction {
  id: string
  venueId: string
  source: DataSource
  date: string // ISO date string
  amount: number
  type: 'income' | 'expense'
  category: ExpenseCategory
  counterparty: string
  description: string
  status: TransactionStatus
  duplicateOfId?: string
  originalFileId?: string
  createdAt: string
}

export interface DeduplicationPair {
  id: string
  venueId: string
  leftTransaction: Transaction
  rightTransaction: Transaction
  matchScore: number // 0-100
  matchReasons: string[]
  status: 'pending' | 'merged' | 'skipped'
  resolvedAt?: string
}

export interface FileUpload {
  id: string
  venueId: string
  source: DataSource
  fileName: string
  fileSize: number
  rowCount: number
  uploadedAt: string
  status: 'processing' | 'completed' | 'error'
  errorMessage?: string
}

export interface DeduplicationLogEntry {
  id: string
  venueId: string
  action: 'merge' | 'skip' | 'unmerge'
  transactionIds: [string, string]
  performedAt: string
}

export interface DashboardMetrics {
  totalRevenue: number
  totalExpenses: number
  totalExpensesAfterDedup: number
  netProfit: number
  savingsPercent: number
  revenueTrend: number // percent change
  expenseTrend: number
  profitTrend: number
  // Restaurant vital metrics
  foodCostAmount: number
  foodCostPercent: number
  payrollAmount: number
  payrollPercent: number
}

export interface DailyMetric {
  date: string
  revenue: number
  expenses: number
  profit: number
}

export interface CategoryBreakdown {
  category: ExpenseCategory
  amount: number
  percent: number
}

export interface SourceBreakdown {
  source: DataSource
  amount: number
  percent: number
  label: string
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Питание',
  bar: 'Бар',
  household: 'Хозтовары',
  services: 'Услуги',
  salary: 'Зарплата',
  rent: 'Аренда',
  utilities: 'Коммунальные',
  marketing: 'Маркетинг',
  other: 'Прочее',
}

export const SOURCE_LABELS: Record<DataSource, string> = {
  iiko: 'iiko',
  bank: 'Банк',
  admin: 'Отчёт администратора',
  manual: 'Ручной ввод',
}

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#3B82F6',
  bar: '#8B5CF6',
  household: '#F59E0B',
  services: '#10B981',
  salary: '#EF4444',
  rent: '#EC4899',
  utilities: '#06B6D4',
  marketing: '#F97316',
  other: '#6B7280',
}

export interface DateRange {
  from: string // ISO date "YYYY-MM-DD"
  to: string   // ISO date "YYYY-MM-DD"
}

export interface InventoryItem {
  id: string
  venueId: string
  period: string          // "YYYY-MM"
  category: ExpenseCategory
  name: string
  unit: string            // кг, л, шт
  expectedQty: number
  actualQty: number
  pricePerUnit: number
  createdAt: string
}

export type CashBalances = Record<string, Record<string, number>>
// cashBalances[venueId]["YYYY-MM"] = amount

export interface OPiUReportData {
  revenue: {
    items: { label: string; amount: number }[]
    total: number
  }
  costOfGoods: {
    items: { category: ExpenseCategory; label: string; amount: number }[]
    total: number
  }
  grossProfit: number
  grossMargin: number
  operatingExpenses: {
    items: { category: ExpenseCategory; label: string; amount: number }[]
    total: number
  }
  operatingProfit: number
  otherExpenses: {
    items: { category: ExpenseCategory; label: string; amount: number }[]
    total: number
  }
  netProfit: number
  netMargin: number
}

export type PIOReportData = OPiUReportData

export interface DDSReportData {
  openingBalance: number
  receipts: {
    items: { label: string; amount: number }[]
    total: number
  }
  payments: {
    groups: {
      label: string
      items: { label: string; amount: number }[]
      total: number
    }[]
    total: number
  }
  netCashFlow: number
  closingBalance: number
}

export interface BalanceSnapshot {
  id: string
  venueId: string
  monthKey: string
  cashAmount: number
  inventoryFood: number
  inventoryBar: number
  accountsReceivable: number
  accountsPayable: number
  payrollPayable: number
  taxesPayable: number
  guestPrepayments: number
  safetyReserveDays: number
  createdAt: string
  updatedAt: string
}

export type LiquidityStatus = 'healthy' | 'warning' | 'critical'

export interface BalanceReportData {
  venueName: string
  monthKey: string
  period: string
  assets: {
    cashAmount: number
    inventoryFood: number
    inventoryBar: number
    accountsReceivable: number
    totalCurrentAssets: number
  }
  liabilities: {
    accountsPayable: number
    payrollPayable: number
    taxesPayable: number
    guestPrepayments: number
    totalCurrentLiabilities: number
  }
  workingCapital: {
    nwc: number
    currentRatio: number
    liquidityStatus: LiquidityStatus
    liquidityLabel: string
  }
  safeDividends: {
    dailyOpex: number
    safetyReserveDays: number
    safetyBuffer: number
    maxSafeDividend: number
    isSafe: boolean
    deficitAmount: number
  }
}

export interface UpsertBalanceInput {
  venueId: string
  monthKey: string
  cashAmount: number
  inventoryFood: number
  inventoryBar: number
  accountsReceivable: number
  accountsPayable: number
  payrollPayable: number
  taxesPayable: number
  guestPrepayments: number
  safetyReserveDays?: number
}

