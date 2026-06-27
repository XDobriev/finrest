import * as XLSX from 'xlsx'
import type { DDSReportData } from '@/types'

export function exportDDSToExcel(report: DDSReportData, venueName: string, period: string) {
  const rows: (string | number)[][] = []

  const addTotal = (label: string, amount: number) => rows.push([label, '', amount])
  const addItem = (label: string, amount: number) => rows.push(['', label, amount])
  const addEmpty = () => rows.push([])

  rows.push(['Отчёт о движении денежных средств (ДДС)'])
  rows.push([`Заведение: ${venueName}`])
  rows.push([`Период: ${period}`])
  addEmpty()

  addTotal('ОСТАТОК НА НАЧАЛО ПЕРИОДА', report.openingBalance)
  addEmpty()

  rows.push(['ПОСТУПЛЕНИЯ'])
  report.receipts.items.forEach(i => addItem(i.label, i.amount))
  addTotal('ИТОГО ПОСТУПЛЕНИЯ', report.receipts.total)
  addEmpty()

  rows.push(['ВЫПЛАТЫ'])
  report.payments.groups.forEach(group => {
    rows.push(['', group.label])
    group.items.forEach(i => rows.push(['', `  ${i.label}`, i.amount]))
    rows.push(['', `Итого ${group.label.toLowerCase()}`, group.total])
  })
  addTotal('ИТОГО ВЫПЛАТЫ', report.payments.total)
  addEmpty()

  addTotal('ЧИСТЫЙ ДЕНЕЖНЫЙ ПОТОК', report.netCashFlow)
  addEmpty()
  addTotal('ОСТАТОК НА КОНЕЦ ПЕРИОДА', report.closingBalance)

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ДДС')
  XLSX.writeFile(wb, `dds_${venueName}_${period}.xlsx`)
}
