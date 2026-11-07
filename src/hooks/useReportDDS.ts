'use client'

import { useMemo } from 'react'
import type { Transaction, DDSReportData, DateRange, CashBalances } from '@/types'
import { calculateDDSReport } from '@/lib/reports/dds'

export function useReportDDS(
  transactions: Transaction[],
  venueId: string,
  dateRange: DateRange,
  cashBalances: CashBalances,
): DDSReportData {
  return useMemo(() => {
    return calculateDDSReport(transactions, venueId, dateRange, cashBalances)
  }, [transactions, venueId, dateRange, cashBalances])
}
