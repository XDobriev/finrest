'use client'

import { useMemo } from 'react'
import type { Transaction, OPiUReportData, DateRange } from '@/types'
import { calculateOPiUReport } from '@/lib/reports/opiu'

export function useReportOPiU(
  transactions: Transaction[],
  venueId: string,
  dateRange: DateRange,
): OPiUReportData {
  return useMemo(() => {
    return calculateOPiUReport(transactions, venueId, dateRange)
  }, [transactions, venueId, dateRange])
}

// Backward compatibility alias
export const useReportPIO = useReportOPiU
