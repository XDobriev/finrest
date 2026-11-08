'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react'
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
import { mockVenues, mockTransactions, mockDeduplicationPairs } from '@/data/mock'
import { generateId } from '@/lib/utils'
import {
  getVenuesAction,
  createVenueAction,
  updateVenueAction,
  deleteVenueAction,
} from '@/app/actions/venues'
import {
  getTransactionsAction,
  createTransactionAction,
  createTransactionsBatchAction,
  updateTransactionStatusAction,
} from '@/app/actions/transactions'
import {
  getDeduplicationPairsAction,
  resolveDeduplicationPairAction,
  runDeduplicationAction,
} from '@/app/actions/deduplication'
import {
  getInventoryItemsAction,
  createInventoryItemAction,
  updateInventoryItemAction,
  deleteInventoryItemAction,
} from '@/app/actions/inventory'
import {
  getCashBalancesAction,
  setCashBalanceAction,
} from '@/app/actions/cash'

interface AppState {
  venues: Venue[]
  selectedVenueId: string
  transactions: Transaction[]
  deduplicationPairs: DeduplicationPair[]
  fileUploads: FileUpload[]
  deduplicationLog: DeduplicationLogEntry[]
  isLoading: boolean

  // Actions
  selectVenue: (venueId: string) => void
  addVenue: (name: string, address?: string) => Promise<void>
  updateVenue: (venueId: string, data: Partial<Venue>) => Promise<void>
  deleteVenue: (venueId: string) => Promise<void>

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => Promise<void>
  addTransactionsBatch: (items: Array<Omit<Transaction, 'id' | 'createdAt' | 'status'>>) => Promise<void>
  updateTransactionStatus: (
    id: string,
    status: Transaction['status'],
    duplicateOfId?: string
  ) => Promise<void>

  resolveDeduplicationPair: (
    pairId: string,
    action: 'merge' | 'skip' | 'unmerge'
  ) => Promise<void>
  runDeduplication: () => Promise<void>

  addFileUpload: (upload: Omit<FileUpload, 'id' | 'uploadedAt'>) => void
  updateDeduplicationSettings: (
    venueId: string,
    settings: DeduplicationSettings
  ) => Promise<void>

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

  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
}

const AppContext = createContext<AppState | null>(null)

function getDefaultDateRange(): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>(mockVenues)
  const [selectedVenueId, setSelectedVenueId] = useLocalStorage<string>(
    'finrest_selected_venue',
    mockVenues[0]?.id || ''
  )
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [deduplicationPairs, setDeduplicationPairs] = useState<DeduplicationPair[]>(
    mockDeduplicationPairs
  )
  const [fileUploads, setFileUploads] = useLocalStorage<FileUpload[]>(
    'finrest_file_uploads',
    []
  )
  const [deduplicationLog, setDeduplicationLog] = useLocalStorage<DeduplicationLogEntry[]>(
    'finrest_dedup_log',
    []
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [dateRange, setDateRange] = useLocalStorage<DateRange>(
    'finrest_date_range',
    getDefaultDateRange()
  )
  const [cashBalances, setCashBalances] = useLocalStorage<CashBalances>(
    'finrest_cash_balances',
    {}
  )
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>(
    'finrest_inventory',
    []
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), [])

  // 1. Initial Load from PostgreSQL
  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        setIsLoading(true)
        const dbVenues = await getVenuesAction()
        if (!isMounted) return

        if (dbVenues && dbVenues.length > 0) {
          setVenues(dbVenues)

          const activeVenueId =
            selectedVenueId && dbVenues.some((v) => v.id === selectedVenueId)
              ? selectedVenueId
              : dbVenues[0].id

          setSelectedVenueId(activeVenueId)

          const [dbTxs, dbPairs, dbInventory, dbCash] = await Promise.all([
            getTransactionsAction(activeVenueId),
            getDeduplicationPairsAction(activeVenueId),
            getInventoryItemsAction(activeVenueId),
            getCashBalancesAction(activeVenueId),
          ])

          if (isMounted) {
            setTransactions(dbTxs)
            setDeduplicationPairs(dbPairs)
            setInventory(dbInventory)
            setCashBalances((prev) => ({
              ...prev,
              [activeVenueId]: dbCash,
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load initial data from PostgreSQL:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Load venue-specific transactions & pairs on venue change
  useEffect(() => {
    if (!selectedVenueId) return
    let isMounted = true

    async function loadVenueData() {
      try {
        const [dbTxs, dbPairs, dbInventory, dbCash] = await Promise.all([
          getTransactionsAction(selectedVenueId),
          getDeduplicationPairsAction(selectedVenueId),
          getInventoryItemsAction(selectedVenueId),
          getCashBalancesAction(selectedVenueId),
        ])

        if (isMounted) {
          setTransactions(dbTxs)
          setDeduplicationPairs(dbPairs)
          setInventory(dbInventory)
          setCashBalances((prev) => ({
            ...prev,
            [selectedVenueId]: dbCash,
          }))
        }
      } catch (err) {
        console.error(`Failed to load data for venue ${selectedVenueId}:`, err)
      }
    }

    loadVenueData()

    return () => {
      isMounted = false
    }
  }, [selectedVenueId, setCashBalances, setInventory])

  const selectVenue = useCallback(
    (venueId: string) => {
      setSelectedVenueId(venueId)
    },
    [setSelectedVenueId]
  )

  const addVenue = useCallback(
    async (name: string, address?: string) => {
      try {
        const created = await createVenueAction(name, address)
        setVenues((prev) => [...prev, created])
        setSelectedVenueId(created.id)
      } catch (err) {
        console.error('Failed to create venue in PostgreSQL:', err)
      }
    },
    [setSelectedVenueId]
  )

  const updateVenue = useCallback(
    async (venueId: string, data: Partial<Venue>) => {
      try {
        const updated = await updateVenueAction(venueId, data)
        setVenues((prev) => prev.map((v) => (v.id === venueId ? updated : v)))
      } catch (err) {
        console.error(`Failed to update venue ${venueId}:`, err)
      }
    },
    []
  )

  const deleteVenue = useCallback(
    async (venueId: string) => {
      try {
        await deleteVenueAction(venueId)
        setVenues((prev) => prev.filter((v) => v.id !== venueId))
        if (selectedVenueId === venueId) {
          const remaining = venues.filter((v) => v.id !== venueId)
          setSelectedVenueId(remaining[0]?.id || '')
        }
      } catch (err) {
        console.error(`Failed to delete venue ${venueId}:`, err)
      }
    },
    [selectedVenueId, venues, setSelectedVenueId]
  )

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => {
      try {
        const created = await createTransactionAction({
          ...tx,
          status: 'unique',
        })
        setTransactions((prev) => [created, ...prev])
      } catch (err) {
        console.error('Failed to create transaction in PostgreSQL:', err)
      }
    },
    []
  )

  const addTransactionsBatch = useCallback(
    async (items: Array<Omit<Transaction, 'id' | 'createdAt' | 'status'>>) => {
      if (items.length === 0) return
      try {
        await createTransactionsBatchAction(
          items.map((it) => ({
            ...it,
            status: 'unique' as const,
          }))
        )
        const refreshed = await getTransactionsAction(selectedVenueId)
        setTransactions(refreshed)
      } catch (err) {
        console.error('Failed to batch create transactions in PostgreSQL:', err)
      }
    },
    [selectedVenueId]
  )

  const updateTransactionStatus = useCallback(
    async (id: string, status: Transaction['status'], duplicateOfId?: string) => {
      try {
        const updated = await updateTransactionStatusAction(id, status, duplicateOfId)
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? updated : t))
        )
      } catch (err) {
        console.error(`Failed to update transaction ${id}:`, err)
      }
    },
    []
  )

  const resolveDeduplicationPair = useCallback(
    async (pairId: string, action: 'merge' | 'skip' | 'unmerge') => {
      try {
        await resolveDeduplicationPairAction(pairId, action)

        setDeduplicationPairs((prev) =>
          prev.map((p) =>
            p.id === pairId
              ? {
                  ...p,
                  status:
                    action === 'merge'
                      ? 'merged'
                      : action === 'skip'
                      ? 'skipped'
                      : 'pending',
                  resolvedAt: new Date().toISOString(),
                }
              : p
          )
        )

        // Reload updated transactions
        if (selectedVenueId) {
          const updatedTxs = await getTransactionsAction(selectedVenueId)
          setTransactions(updatedTxs)
        }
      } catch (err) {
        console.error(`Failed to resolve deduplication pair ${pairId}:`, err)
      }
    },
    [selectedVenueId]
  )

  const runDeduplication = useCallback(async () => {
    if (!selectedVenueId) return
    try {
      const pairs = await runDeduplicationAction(selectedVenueId)
      setDeduplicationPairs(pairs)
    } catch (err) {
      console.error('Failed to run deduplication in PostgreSQL:', err)
    }
  }, [selectedVenueId])

  const addFileUpload = useCallback(
    (upload: Omit<FileUpload, 'id' | 'uploadedAt'>) => {
      const newUpload: FileUpload = {
        ...upload,
        id: generateId(),
        uploadedAt: new Date().toISOString(),
      }
      setFileUploads((prev) => [...prev, newUpload])
    },
    [setFileUploads]
  )

  const updateDeduplicationSettings = useCallback(
    async (venueId: string, settings: DeduplicationSettings) => {
      try {
        const updated = await updateVenueAction(venueId, {
          dateToleranceDays: settings.dateToleranceDays,
          amountTolerancePercent: settings.amountTolerancePercent,
          fuzzyMatchThreshold: settings.fuzzyMatchThreshold,
        })
        setVenues((prev) => prev.map((v) => (v.id === venueId ? updated : v)))
      } catch (err) {
        console.error('Failed to update deduplication settings:', err)
      }
    },
    []
  )

  const setCashBalance = useCallback(
    async (venueId: string, monthKey: string, amount: number) => {
      try {
        await setCashBalanceAction(venueId, monthKey, amount)
        setCashBalances((prev) => ({
          ...prev,
          [venueId]: {
            ...(prev[venueId] || {}),
            [monthKey]: amount,
          },
        }))
      } catch (err) {
        console.error('Failed to update cash balance in PostgreSQL:', err)
      }
    },
    [setCashBalances]
  )

  const addInventoryItem = useCallback(
    async (item: Omit<InventoryItem, 'id' | 'createdAt'>) => {
      try {
        const created = await createInventoryItemAction({
          ...item,
          venueId: selectedVenueId,
        })
        setInventory((prev) => [...prev, created])
      } catch (err) {
        console.error('Failed to create inventory item in PostgreSQL:', err)
      }
    },
    [selectedVenueId, setInventory]
  )

  const updateInventoryItem = useCallback(
    async (id: string, data: Partial<InventoryItem>) => {
      try {
        const updated = await updateInventoryItemAction(id, data)
        setInventory((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        )
      } catch (err) {
        console.error(`Failed to update inventory item ${id}:`, err)
      }
    },
    [setInventory]
  )

  const deleteInventoryItem = useCallback(
    async (id: string) => {
      try {
        await deleteInventoryItemAction(id)
        setInventory((prev) => prev.filter((item) => item.id !== id))
      } catch (err) {
        console.error(`Failed to delete inventory item ${id}:`, err)
      }
    },
    [setInventory]
  )

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
  }, [
    venues,
    selectedVenueId,
    transactions,
    deduplicationPairs,
    fileUploads,
    deduplicationLog,
    dateRange,
    cashBalances,
    inventory,
  ])

  const importAllData = useCallback(
    (json: string): boolean => {
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
    },
    [
      setSelectedVenueId,
      setDateRange,
      setFileUploads,
      setDeduplicationLog,
      setCashBalances,
      setInventory,
    ]
  )

  const resetAllData = useCallback(() => {
    setVenues(mockVenues)
    setSelectedVenueId(mockVenues[0].id)
    setTransactions(mockTransactions)
    setDeduplicationPairs(mockDeduplicationPairs)
    setFileUploads([])
    setDeduplicationLog([])
    setDateRange(getDefaultDateRange())
    setCashBalances({})
    setInventory([])
  }, [
    setSelectedVenueId,
    setDateRange,
    setFileUploads,
    setDeduplicationLog,
    setCashBalances,
    setInventory,
  ])

  const value = useMemo(
    () => ({
      venues,
      selectedVenueId,
      transactions,
      deduplicationPairs,
      fileUploads,
      deduplicationLog,
      isLoading,
      selectVenue,
      addVenue,
      updateVenue,
      deleteVenue,
      addTransaction,
      addTransactionsBatch,
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
      mobileMenuOpen,
      setMobileMenuOpen,
      toggleMobileMenu,
    }),
    [
      venues,
      selectedVenueId,
      transactions,
      deduplicationPairs,
      fileUploads,
      deduplicationLog,
      isLoading,
      selectVenue,
      addVenue,
      updateVenue,
      deleteVenue,
      addTransaction,
      addTransactionsBatch,
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
      mobileMenuOpen,
      toggleMobileMenu,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
