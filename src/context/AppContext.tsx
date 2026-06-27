'use client'

import React, { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  Transaction,
  Venue,
  DeduplicationPair,
  FileUpload,
  DeduplicationLogEntry,
  DeduplicationSettings,
  DateRange,
  InventoryItem,
  CashBalances,
} from '@/types'
import {
  mockTransactions,
  mockVenues,
  mockDeduplicationPairs,
  mockFileUploads,
  mockDeduplicationLog,
} from '@/data/mock'
import { generateId } from '@/lib/utils'

interface AppState {
  venues: Venue[]
  selectedVenueId: string
  transactions: Transaction[]
  deduplicationPairs: DeduplicationPair[]
  fileUploads: FileUpload[]
  deduplicationLog: DeduplicationLogEntry[]

  // Actions
  selectVenue: (venueId: string) => void
  addVenue: (name: string, address?: string) => void
  updateVenue: (venueId: string, data: Partial<Venue>) => void
  deleteVenue: (venueId: string) => void

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => void
  updateTransactionStatus: (id: string, status: Transaction['status'], duplicateOfId?: string) => void

  resolveDeduplicationPair: (pairId: string, action: 'merge' | 'skip' | 'unmerge') => void
  runDeduplication: () => void

  addFileUpload: (upload: Omit<FileUpload, 'id' | 'uploadedAt'>) => void
  updateDeduplicationSettings: (venueId: string, settings: DeduplicationSettings) => void

  dateRange: DateRange
  setDateRange: (range: DateRange) => void

  cashBalances: CashBalances
  setCashBalance: (venueId: string, monthKey: string, amount: number) => void

  inventory: InventoryItem[]
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt'>) => void
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void
  deleteInventoryItem: (id: string) => void

  exportAllData: () => string
  importAllData: (json: string) => boolean
  resetAllData: () => void
}

const AppContext = createContext<AppState | null>(null)

function getDefaultDateRange(): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useLocalStorage<Venue[]>('finrest_venues', mockVenues)
  const [selectedVenueId, setSelectedVenueId] = useLocalStorage<string>('finrest_selected_venue', mockVenues[0].id)
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('finrest_transactions', mockTransactions)
  const [deduplicationPairs, setDeduplicationPairs] = useLocalStorage<DeduplicationPair[]>('finrest_dedup_pairs', mockDeduplicationPairs)
  const [fileUploads, setFileUploads] = useLocalStorage<FileUpload[]>('finrest_file_uploads', mockFileUploads)
  const [deduplicationLog, setDeduplicationLog] = useLocalStorage<DeduplicationLogEntry[]>('finrest_dedup_log', mockDeduplicationLog)

  const [dateRange, setDateRange] = useLocalStorage<DateRange>('finrest_date_range', getDefaultDateRange())
  const [cashBalances, setCashBalances] = useLocalStorage<CashBalances>('finrest_cash_balances', {})
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('finrest_inventory', [])

  const selectVenue = useCallback((venueId: string) => {
    setSelectedVenueId(venueId)
  }, [])

  const addVenue = useCallback((name: string, address?: string) => {
    const newVenue: Venue = {
      id: generateId(),
      name,
      address,
      createdAt: new Date().toISOString(),
      deduplicationSettings: {
        dateToleranceDays: 1,
        amountTolerancePercent: 5,
        fuzzyMatchThreshold: 0.7,
      },
    }
    setVenues(prev => [...prev, newVenue])
    setSelectedVenueId(newVenue.id)
  }, [])

  const updateVenue = useCallback((venueId: string, data: Partial<Venue>) => {
    setVenues(prev => prev.map(v => (v.id === venueId ? { ...v, ...data } : v)))
  }, [])

  const deleteVenue = useCallback((venueId: string) => {
    setVenues(prev => prev.filter(v => v.id !== venueId))
    if (selectedVenueId === venueId) {
      setSelectedVenueId(prev => {
        const remaining = mockVenues.filter(v => v.id !== venueId)
        return remaining[0]?.id || ''
      })
    }
  }, [selectedVenueId])

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => {
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    }
    setTransactions(prev => [...prev, newTx])
  }, [])

  const updateTransactionStatus = useCallback(
    (id: string, status: Transaction['status'], duplicateOfId?: string) => {
      setTransactions(prev =>
        prev.map(t => (t.id === id ? { ...t, status, duplicateOfId } : t))
      )
    },
    []
  )

  const resolveDeduplicationPair = useCallback(
    (pairId: string, action: 'merge' | 'skip' | 'unmerge') => {
      setDeduplicationPairs(prev =>
        prev.map(p =>
          p.id === pairId
            ? { ...p, status: action === 'merge' ? 'merged' : action === 'skip' ? 'skipped' : 'pending', resolvedAt: new Date().toISOString() }
            : p
        )
      )

      const pair = deduplicationPairs.find(p => p.id === pairId)
      if (pair) {
        if (action === 'merge') {
          updateTransactionStatus(
            pair.rightTransaction.id,
            'duplicate',
            pair.leftTransaction.id
          )
        }
        if (action === 'unmerge') {
          updateTransactionStatus(pair.rightTransaction.id, 'unique')
          updateTransactionStatus(pair.leftTransaction.id, 'unique')
        }

        const logEntry: DeduplicationLogEntry = {
          id: generateId(),
          venueId: pair.venueId,
          action,
          transactionIds: [pair.leftTransaction.id, pair.rightTransaction.id],
          performedAt: new Date().toISOString(),
        }
        setDeduplicationLog(prev => [...prev, logEntry])
      }
    },
    [deduplicationPairs, updateTransactionStatus]
  )

  const runDeduplication = useCallback(() => {
    // Simple deduplication algorithm for MVP
    // In production, this would use the full matcher.ts
    const expenses = transactions.filter(t => t.type === 'expense' && t.status !== 'duplicate')

    const newPairs: DeduplicationPair[] = []
    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        const a = expenses[i]
        const b = expenses[j]
        if (a.venueId !== b.venueId) continue

        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        const dateDiff = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24)
        if (dateDiff > 1) continue

        const amountDiff = Math.abs(a.amount - b.amount) / Math.max(a.amount, b.amount)
        if (amountDiff > 0.05) continue

        const reasons: string[] = []
        if (amountDiff < 0.01) reasons.push('Сумма совпадает')
        else reasons.push('Сумма похожа')

        if (dateDiff === 0) reasons.push('Дата совпадает')
        else reasons.push('Дата похожа')

        if (a.counterparty.toLowerCase() === b.counterparty.toLowerCase()) {
          reasons.push('Контрагент совпадает')
        }

        const score = Math.round(95 - dateDiff * 10 - amountDiff * 100)

        const existingPair = deduplicationPairs.find(
          p =>
            p.status === 'pending' &&
            ((p.leftTransaction.id === a.id && p.rightTransaction.id === b.id) ||
              (p.leftTransaction.id === b.id && p.rightTransaction.id === a.id))
        )
        if (existingPair) continue

        newPairs.push({
          id: generateId(),
          venueId: a.venueId,
          leftTransaction: a,
          rightTransaction: b,
          matchScore: Math.min(score, 99),
          matchReasons: reasons,
          status: 'pending',
        })
      }
    }

    setDeduplicationPairs(prev => [...prev, ...newPairs])
  }, [transactions, deduplicationPairs])

  const addFileUpload = useCallback((upload: Omit<FileUpload, 'id' | 'uploadedAt'>) => {
    const newUpload: FileUpload = {
      ...upload,
      id: generateId(),
      uploadedAt: new Date().toISOString(),
    }
    setFileUploads(prev => [...prev, newUpload])
  }, [])

  const updateDeduplicationSettings = useCallback(
    (venueId: string, settings: DeduplicationSettings) => {
      setVenues(prev =>
        prev.map(v => (v.id === venueId ? { ...v, deduplicationSettings: settings } : v))
      )
    },
    []
  )

  const setCashBalance = useCallback((venueId: string, monthKey: string, amount: number) => {
    setCashBalances(prev => ({
      ...prev,
      [venueId]: {
        ...(prev[venueId] || {}),
        [monthKey]: amount,
      },
    }))
  }, [setCashBalances])

  const addInventoryItem = useCallback((item: Omit<InventoryItem, 'id' | 'createdAt'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    setInventory(prev => [...prev, newItem])
  }, [setInventory])

  const updateInventoryItem = useCallback((id: string, data: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...data } : item))
  }, [setInventory])

  const deleteInventoryItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id))
  }, [setInventory])

  const exportAllData = useCallback((): string => {
    const data = {
      venues,
      selectedVenueId,
      transactions,
      deduplicationPairs,
      fileUploads,
      deduplicationLog,
      dateRange,
      cashBalances,
      inventory,
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(data, null, 2)
  }, [venues, selectedVenueId, transactions, deduplicationPairs, fileUploads, deduplicationLog, dateRange, cashBalances, inventory])

  const importAllData = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json)
      if (!data.venues || !data.transactions) return false
      setVenues(data.venues)
      setSelectedVenueId(data.selectedVenueId || data.venues[0]?.id || '')
      setTransactions(data.transactions)
      setDeduplicationPairs(data.deduplicationPairs || [])
      setFileUploads(data.fileUploads || [])
      setDeduplicationLog(data.deduplicationLog || [])
      setDateRange(data.dateRange || getDefaultDateRange())
      setCashBalances(data.cashBalances || {})
      setInventory(data.inventory || [])
      return true
    } catch {
      return false
    }
  }, [setVenues, setSelectedVenueId, setTransactions, setDeduplicationPairs, setFileUploads, setDeduplicationLog, setDateRange, setCashBalances, setInventory])

  const resetAllData = useCallback(() => {
    setVenues(mockVenues)
    setSelectedVenueId(mockVenues[0].id)
    setTransactions(mockTransactions)
    setDeduplicationPairs(mockDeduplicationPairs)
    setFileUploads(mockFileUploads)
    setDeduplicationLog([])
    setDateRange(getDefaultDateRange())
    setCashBalances({})
    setInventory([])
  }, [setVenues, setSelectedVenueId, setTransactions, setDeduplicationPairs, setFileUploads, setDeduplicationLog, setDateRange, setCashBalances, setInventory])

  const value = useMemo(
    () => ({
      venues,
      selectedVenueId,
      transactions,
      deduplicationPairs,
      fileUploads,
      deduplicationLog,
      selectVenue,
      addVenue,
      updateVenue,
      deleteVenue,
      addTransaction,
      updateTransactionStatus,
      resolveDeduplicationPair,
      runDeduplication,
      addFileUpload,
      updateDeduplicationSettings,
      dateRange,
      setDateRange,
      cashBalances,
      setCashBalance,
      inventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      exportAllData,
      importAllData,
      resetAllData,
    }),
    [
      venues,
      selectedVenueId,
      transactions,
      deduplicationPairs,
      fileUploads,
      deduplicationLog,
      selectVenue,
      addVenue,
      updateVenue,
      deleteVenue,
      addTransaction,
      updateTransactionStatus,
      resolveDeduplicationPair,
      runDeduplication,
      addFileUpload,
      updateDeduplicationSettings,
      dateRange,
      setDateRange,
      cashBalances,
      setCashBalance,
      inventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      exportAllData,
      importAllData,
      resetAllData,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
