import * as XLSX from 'xlsx'
import type { PIOReportData } from '@/types'

export function exportPIOToExcel(report: PIOReportData, venueName: string, period: string) {
  const rows: (string | number)[][] = []

  const addSection = (title: string) => {
    rows.push([title])
  }
  const addItem = (label: string, amount: number) => {
    rows.push(['', label, amount])
  }
  const addTotal = (label: string, amount: number) => {
    rows.push([label, '', amount])
  }
  const addEmpty = () => rows.push([])

  rows.push(['Отчёт о прибылях и убытках (ПИО)'])
  rows.push([`Заведение: ${venueName}`])
  rows.push([`Период: ${period}`])
  addEmpty()

  addSection('ВЫРУЧКА')
  report.revenue.items.forEach(i => addItem(i.label, i.amount))
  addTotal('ИТОГО ВЫРУЧКА', report.revenue.total)
  addEmpty()

  addSection('СЕБЕСТОИМОСТЬ')
  report.costOfGoods.items.forEach(i => addItem(i.label, i.amount))
  addTotal('ИТОГО СЕБЕСТОИМОСТЬ', report.costOfGoods.total)
  addEmpty()

  addTotal('ВАЛОВАЯ ПРИБЫЛЬ', report.grossProfit)
  rows.push(['', `Маржа: ${report.grossMargin.toFixed(1)}%`])
  addEmpty()

  addSection('ОПЕРАЦИОННЫЕ РАСХОДЫ')
  report.operatingExpenses.items.forEach(i => addItem(i.label, i.amount))
  addTotal('ИТОГО ОПЕРАЦИОННЫЕ', report.operatingExpenses.total)
  addEmpty()

  addTotal('ОПЕРАЦИОННАЯ ПРИБЫЛЬ', report.operatingProfit)
  addEmpty()

  if (report.otherExpenses.items.length > 0) {
    addSection('ПРОЧИЕ РАСХОДЫ')
    report.otherExpenses.items.forEach(i => addItem(i.label, i.amount))
    addTotal('ИТОГО ПРОЧИЕ', report.otherExpenses.total)
    addEmpty()
  }

  addTotal('ЧИСТАЯ ПРИБЫЛЬ', report.netProfit)
  rows.push(['', `Рентабельность: ${report.netMargin.toFixed(1)}%`])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ПИО')
  XLSX.writeFile(wb, `pio_${venueName}_${period}.xlsx`)
}
