import * as XLSX from 'xlsx'
import type { BalanceReportData } from '@/types'

export function exportBalanceToExcel(data: BalanceReportData, venueName: string, monthKey: string) {
  const rows: (string | number)[][] = []

  const addHeader = (text: string) => rows.push([text])
  const addEmpty = () => rows.push([])
  const addItem = (category: string, label: string, amount: number) => rows.push([category, label, amount])
  const addTotal = (label: string, amount: number) => rows.push([label, '', amount])

  addHeader('УПРАВЛЕНЧЕСКИЙ БАЛАНС И ОБОРОТНЫЙ КАПИТАЛ (HORECA)')
  addHeader(`Заведение: ${venueName}`)
  addHeader(`Период: ${monthKey}`)
  addEmpty()

  addHeader('1. ОБОРОТНЫЕ АКТИВЫ')
  addItem('Деньги', 'Касса, сейф, расчетные счета, эквайринг в пути', data.assets.cashAmount)
  addItem('Запасы', 'Склад Кухня (продукты, полуфабрикаты)', data.assets.inventoryFood)
  addItem('Запасы', 'Склад Бар (алкоголь, напитки)', data.assets.inventoryBar)
  addItem('Дебиторка', 'Агрегаторы доставки, корпоративные банкеты', data.assets.accountsReceivable)
  addTotal('ИТОГО ОБОРОТНЫХ АКТИВОВ', data.assets.totalCurrentAssets)
  addEmpty()

  addHeader('2. КРАТКОСРОЧНЫЕ ОБЯЗАТЕЛЬСТВА')
  addItem('Поставщики', 'Кредиторка по накладным продуктов и алкоголя', data.liabilities.accountsPayable)
  addItem('Персонал', 'Начисленный ФОТ к выплате', data.liabilities.payrollPayable)
  addItem('Налоги', 'Налоги и страховые взносы к уплате', data.liabilities.taxesPayable)
  addItem('Гости', 'Предоплаты за банкеты и сертификаты', data.liabilities.guestPrepayments)
  addTotal('ИТОГО ОБЯЗАТЕЛЬСТВ', data.liabilities.totalCurrentLiabilities)
  addEmpty()

  addHeader('3. ФИНАНСОВЫЙ АНАЛИЗ И РАДАР ЛИКВИДНОСТИ')
  rows.push(['Чистый оборотный капитал (NWC)', '', data.workingCapital.nwc])
  rows.push(['Коэффициент текущей ликвидности (CR)', '', data.workingCapital.currentRatio])
  rows.push(['Статус ликвидности', '', data.workingCapital.liquidityLabel])
  addEmpty()

  addHeader('4. КАЛЬКУЛЯТОР БЕЗОПАСНЫХ ДИВИДЕНДОВ')
  rows.push(['Дней операционного буфера', '', data.safeDividends.safetyReserveDays])
  rows.push(['Неснижаемый операционный резерв', '', data.safeDividends.safetyBuffer])
  rows.push(['Рекомендуемый лимит дивидендов', '', data.safeDividends.maxSafeDividend])
  rows.push([
    'Вердикт по дивидендам',
    '',
    data.safeDividends.isSafe
      ? 'Выплата безопасна'
      : `Риск кассового разрыва! Дефицит: ${data.safeDividends.deficitAmount} руб.`,
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Баланс')

  const fileName = `Баланс_${venueName.replace(/\s+/g, '_')}_${monthKey}.xlsx`
  XLSX.writeFile(wb, fileName)
}
