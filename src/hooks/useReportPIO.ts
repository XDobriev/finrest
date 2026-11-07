'use client'

import { useMemo } from 'react'
import type { Transaction, PIOReportData, DateRange } from '@/types'
import { calculatePIOReport } from '@/lib/reports/pio'

export function useReportPIO(
  transactions: Transaction[],
  venueId: string,
  dateRange: DateRange,
): PIOReportData {
  return useMemo(() => {
    return calculatePIOReport(transactions, venueId, dateRange)
  }, [transactions, venueId, dateRange])
}
