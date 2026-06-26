import {
  Venue,
  Transaction,
  DeduplicationPair,
  FileUpload,
  DeduplicationLogEntry,
  DeduplicationSettings,
  DataSource,
  ExpenseCategory,
} from '@/types'

const defaultSettings: DeduplicationSettings = {
  dateToleranceDays: 1,
  amountTolerancePercent: 5,
  fuzzyMatchThreshold: 0.7,
}

export const mockVenues: Venue[] = [
  {
    id: 'venue-1',
    name: 'Ресторан «Оливье»',
    address: 'ул. Пушкина, д. 10',
    createdAt: '2025-01-15T10:00:00Z',
    deduplicationSettings: defaultSettings,
  },
  {
    id: 'venue-2',
    name: 'Кафе «Бистро»',
    address: 'пр. Мира, д. 25',
    createdAt: '2025-02-01T10:00:00Z',
    deduplicationSettings: defaultSettings,
  },
  {
    id: 'venue-3',
    name: 'Бар «Коктейль»',
    address: 'ул. Ленина, д. 5',
    createdAt: '2025-03-10T10:00:00Z',
    deduplicationSettings: defaultSettings,
  },
]

function makeTx(
  id: string,
  venueId: string,
  source: DataSource,
  date: string,
  amount: number,
  type: 'income' | 'expense',
  category: ExpenseCategory,
  counterparty: string,
  description: string,
  status: 'unique' | 'duplicate' | 'pending_review',
  duplicateOfId?: string
): Transaction {
  return {
    id,
    venueId,
    source,
    date,
    amount,
    type,
    category,
    counterparty,
    description,
    status,
    duplicateOfId,
    createdAt: '2025-06-01T10:00:00Z',
  }
}

export const mockTransactions: Transaction[] = [
  // ============ Ресторан «Оливье» - Доходы ============
  makeTx('tx-1', 'venue-1', 'bank', '2025-06-01', 285000, 'income', 'food', 'Карточный терминал', 'Выручка за 01.06', 'unique'),
  makeTx('tx-2', 'venue-1', 'bank', '2025-06-02', 312000, 'income', 'food', 'Карточный терминал', 'Выручка за 02.06', 'unique'),
  makeTx('tx-3', 'venue-1', 'bank', '2025-06-03', 298500, 'income', 'food', 'Карточный терминал', 'Выручка за 03.06', 'unique'),
  makeTx('tx-4', 'venue-1', 'bank', '2025-06-04', 275000, 'income', 'food', 'Карточный терминал', 'Выручка за 04.06', 'unique'),
  makeTx('tx-5', 'venue-1', 'bank', '2025-06-05', 330000, 'income', 'food', 'Карточный терминал', 'Выручка за 05.06', 'unique'),
  makeTx('tx-6', 'venue-1', 'bank', '2025-06-06', 345000, 'income', 'food', 'Карточный терминал', 'Выручка за 06.06', 'unique'),
  makeTx('tx-7', 'venue-1', 'bank', '2025-06-07', 358000, 'income', 'food', 'Карточный терминал', 'Выручка за 07.06', 'unique'),
  makeTx('tx-8', 'venue-1', 'bank', '2025-06-08', 290000, 'income', 'food', 'Карточный терминал', 'Выручка за 08.06', 'unique'),
  makeTx('tx-9', 'venue-1', 'bank', '2025-06-09', 310000, 'income', 'food', 'Карточный терминал', 'Выручка за 09.06', 'unique'),
  makeTx('tx-10', 'venue-1', 'bank', '2025-06-10', 325000, 'income', 'food', 'Карточный терминал', 'Выручка за 10.06', 'unique'),

  // ============ Ресторан «Оливье» - Расходы (iiko) ============
  makeTx('tx-11', 'venue-1', 'iiko', '2025-06-01', 45000, 'expense', 'food', 'ООО «ФудСнаб»', 'Поставка продуктов', 'unique'),
  makeTx('tx-12', 'venue-1', 'iiko', '2025-06-02', 12000, 'expense', 'bar', 'ООО «АлкоСнаб»', 'Алкогольная поставка', 'unique'),
  makeTx('tx-13', 'venue-1', 'iiko', '2025-06-03', 8500, 'expense', 'household', 'ООО «ХозТорг»', 'Хозтовары', 'unique'),
  makeTx('tx-14', 'venue-1', 'iiko', '2025-06-04', 35000, 'expense', 'food', 'ИП Иванов', 'Мясная продукция', 'unique'),
  makeTx('tx-15', 'venue-1', 'iiko', '2025-06-05', 22000, 'expense', 'food', 'ООО «ФудСнаб»', 'Поставка овощей', 'unique'),
  makeTx('tx-16', 'venue-1', 'iiko', '2025-06-06', 15000, 'expense', 'bar', 'ООО «АлкоСнаб»', 'Пиво и напитки', 'unique'),
  makeTx('tx-17', 'venue-1', 'iiko', '2025-06-07', 5000, 'expense', 'household', 'ООО «Чистота»', 'Средства гигиены', 'unique'),
  makeTx('tx-18', 'venue-1', 'iiko', '2025-06-08', 68000, 'expense', 'food', 'ООО «МолокоПродукт»', 'Молочная продукция', 'unique'),
  makeTx('tx-19', 'venue-1', 'iiko', '2025-06-09', 9000, 'expense', 'services', 'ИП Петров', 'Техническое обслуживание', 'unique'),
  makeTx('tx-20', 'venue-1', 'iiko', '2025-06-10', 42000, 'expense', 'food', 'ООО «ФудСнаб»', 'Поставка продуктов', 'unique'),

  // ============ Ресторан «Оливье» - Расходы (Банк) ============
  makeTx('tx-21', 'venue-1', 'bank', '2025-06-01', 45000, 'expense', 'food', 'ООО ФУДСНАБ', 'Безналичный перевод', 'duplicate', 'tx-11'),
  makeTx('tx-22', 'venue-1', 'bank', '2025-06-02', 12000, 'expense', 'bar', 'ООО АЛКОСНАБ', 'Безналичный перевод', 'duplicate', 'tx-12'),
  makeTx('tx-23', 'venue-1', 'bank', '2025-06-04', 35100, 'expense', 'food', 'ИП Иванов А.С.', 'Безналичный перевод', 'duplicate', 'tx-14'),
  makeTx('tx-24', 'venue-1', 'bank', '2025-06-05', 22000, 'expense', 'food', 'ООО ФУДСНАБ', 'Безналичный перевод', 'duplicate', 'tx-15'),
  makeTx('tx-25', 'venue-1', 'bank', '2025-06-06', 15000, 'expense', 'bar', 'ООО АЛКОСНАБ', 'Безналичный перевод', 'duplicate', 'tx-16'),
  makeTx('tx-26', 'venue-1', 'bank', '2025-06-08', 68500, 'expense', 'food', 'ООО МОЛОКОПРОДУКТ', 'Безналичный перевод', 'duplicate', 'tx-18'),

  // ============ Ресторан «Оливье» - Расходы (Админ) - дубли ============
  makeTx('tx-27', 'venue-1', 'admin', '2025-06-01', 45000, 'expense', 'food', 'ФудСнаб', 'Поставка продуктов', 'duplicate', 'tx-11'),
  makeTx('tx-28', 'venue-1', 'admin', '2025-06-03', 8600, 'expense', 'household', 'ХозТорг', 'Хозтовары для кухни', 'duplicate', 'tx-13'),
  makeTx('tx-29', 'venue-1', 'admin', '2025-06-05', 22500, 'expense', 'food', 'ФудСнаб', 'Овощи и зелень', 'duplicate', 'tx-15'),
  makeTx('tx-30', 'venue-1', 'admin', '2025-06-07', 5200, 'expense', 'household', 'Чистота', 'Моющие средства', 'duplicate', 'tx-17'),

  // ============ Ресторан «Оливье» - Уникальные админ-расходы ============
  makeTx('tx-31', 'venue-1', 'admin', '2025-06-02', 3000, 'expense', 'other', 'Магазин', 'Мелкий инвентарь', 'unique'),
  makeTx('tx-32', 'venue-1', 'admin', '2025-06-04', 7500, 'expense', 'services', 'Ремонт', 'Починка кофемашины', 'unique'),
  makeTx('tx-33', 'venue-1', 'admin', '2025-06-06', 2000, 'expense', 'other', 'Касса', 'Транспортные расходы', 'unique'),
  makeTx('tx-34', 'venue-1', 'admin', '2025-06-08', 4000, 'expense', 'marketing', 'Соцсети', 'Реклама VK', 'unique'),

  // ============ Кафе «Бистро» ============
  makeTx('tx-40', 'venue-2', 'bank', '2025-06-01', 145000, 'income', 'food', 'Карточный терминал', 'Выручка за 01.06', 'unique'),
  makeTx('tx-41', 'venue-2', 'bank', '2025-06-02', 158000, 'income', 'food', 'Карточный терминал', 'Выручка за 02.06', 'unique'),
  makeTx('tx-42', 'venue-2', 'bank', '2025-06-03', 162000, 'income', 'food', 'Карточный терминал', 'Выручка за 03.06', 'unique'),
  makeTx('tx-43', 'venue-2', 'bank', '2025-06-04', 138000, 'income', 'food', 'Карточный терминал', 'Выручка за 04.06', 'unique'),
  makeTx('tx-44', 'venue-2', 'bank', '2025-06-05', 155000, 'income', 'food', 'Карточный терминал', 'Выручка за 05.06', 'unique'),
  makeTx('tx-45', 'venue-2', 'iiko', '2025-06-01', 25000, 'expense', 'food', 'ООО «ФудСнаб»', 'Кофе и чай', 'unique'),
  makeTx('tx-46', 'venue-2', 'iiko', '2025-06-02', 18000, 'expense', 'food', 'ООО «Выпечка»', 'Выпечка', 'unique'),
  makeTx('tx-47', 'venue-2', 'iiko', '2025-06-03', 6000, 'expense', 'household', 'ООО «ХозТорг»', 'Расходники', 'unique'),
  makeTx('tx-48', 'venue-2', 'admin', '2025-06-01', 25000, 'expense', 'food', 'ФудСнаб', 'Кофе', 'duplicate', 'tx-45'),
  makeTx('tx-49', 'venue-2', 'bank', '2025-06-01', 25000, 'expense', 'food', 'ООО ФУДСНАБ', 'Безналичный перевод', 'duplicate', 'tx-45'),
  makeTx('tx-50', 'venue-2', 'admin', '2025-06-03', 5800, 'expense', 'household', 'ХозТорг', 'Расходники', 'duplicate', 'tx-47'),
  makeTx('tx-51', 'venue-2', 'admin', '2025-06-04', 3500, 'expense', 'services', 'Клининг', 'Уборка', 'unique'),

  // ============ Бар «Коктейль» ============
  makeTx('tx-60', 'venue-3', 'bank', '2025-06-01', 98000, 'income', 'bar', 'Карточный терминал', 'Выручка за 01.06', 'unique'),
  makeTx('tx-61', 'venue-3', 'bank', '2025-06-02', 112000, 'income', 'bar', 'Карточный терминал', 'Выручка за 02.06', 'unique'),
  makeTx('tx-62', 'venue-3', 'bank', '2025-06-03', 105000, 'income', 'bar', 'Карточный терминал', 'Выручка за 03.06', 'unique'),
  makeTx('tx-63', 'venue-3', 'bank', '2025-06-04', 95000, 'income', 'bar', 'Карточный терминал', 'Выручка за 04.06', 'unique'),
  makeTx('tx-64', 'venue-3', 'iiko', '2025-06-01', 32000, 'expense', 'bar', 'ООО «АлкоСнаб»', 'Алкоголь', 'unique'),
  makeTx('tx-65', 'venue-3', 'iiko', '2025-06-02', 15000, 'expense', 'bar', 'ООО «Сиропы»', 'Сиропы и добавки', 'unique'),
  makeTx('tx-66', 'venue-3', 'bank', '2025-06-01', 32400, 'expense', 'bar', 'ООО АЛКОСНАБ', 'Безналичный', 'duplicate', 'tx-64'),
  makeTx('tx-67', 'venue-3', 'admin', '2025-06-02', 15500, 'expense', 'bar', 'Сиропы', 'Сиропы', 'duplicate', 'tx-65'),
  makeTx('tx-68', 'venue-3', 'admin', '2025-06-03', 8000, 'expense', 'marketing', 'Фотограф', 'Фотосессия', 'unique'),
  makeTx('tx-69', 'venue-3', 'admin', '2025-06-04', 25000, 'expense', 'rent', 'Аренда', 'Аренда помещения', 'unique'),
]

export const mockDeduplicationPairs: DeduplicationPair[] = [
  {
    id: 'pair-1',
    venueId: 'venue-1',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-11')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-21')!,
    matchScore: 95,
    matchReasons: ['Сумма совпадает', 'Дата совпадает', 'Контрагент похож (ФудСнаб)'],
    status: 'pending',
  },
  {
    id: 'pair-2',
    venueId: 'venue-1',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-14')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-23')!,
    matchScore: 88,
    matchReasons: ['Сумма похожа (±1%)', 'Дата совпадает', 'Контрагент совпадает'],
    status: 'pending',
  },
  {
    id: 'pair-3',
    venueId: 'venue-1',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-11')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-27')!,
    matchScore: 82,
    matchReasons: ['Сумма совпадает', 'Дата совпадает', 'Контрагент похож'],
    status: 'pending',
  },
  {
    id: 'pair-4',
    venueId: 'venue-1',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-13')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-28')!,
    matchScore: 75,
    matchReasons: ['Сумма похожа (±1%)', 'Контрагент совпадает', 'Категория совпадает'],
    status: 'pending',
  },
  {
    id: 'pair-5',
    venueId: 'venue-1',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-15')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-29')!,
    matchScore: 70,
    matchReasons: ['Сумма похожа (±2%)', 'Контрагент совпадает'],
    status: 'pending',
  },
  {
    id: 'pair-6',
    venueId: 'venue-1',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-17')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-30')!,
    matchScore: 68,
    matchReasons: ['Сумма похожа (±4%)', 'Контрагент похож', 'Категория совпадает'],
    status: 'pending',
  },
  {
    id: 'pair-7',
    venueId: 'venue-2',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-45')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-49')!,
    matchScore: 92,
    matchReasons: ['Сумма совпадает', 'Дата совпадает', 'Контрагент похож'],
    status: 'pending',
  },
  {
    id: 'pair-8',
    venueId: 'venue-3',
    leftTransaction: mockTransactions.find(t => t.id === 'tx-65')!,
    rightTransaction: mockTransactions.find(t => t.id === 'tx-67')!,
    matchScore: 78,
    matchReasons: ['Сумма похожа (±3%)', 'Контрагент совпадает', 'Дата совпадает'],
    status: 'pending',
  },
]

export const mockFileUploads: FileUpload[] = [
  {
    id: 'upload-1',
    venueId: 'venue-1',
    source: 'iiko',
    fileName: 'olivie_invoices_june.xlsx',
    fileSize: 245760,
    rowCount: 45,
    uploadedAt: '2025-06-10T14:30:00Z',
    status: 'completed',
  },
  {
    id: 'upload-2',
    venueId: 'venue-1',
    source: 'bank',
    fileName: 'sber_extract_june.csv',
    fileSize: 184320,
    rowCount: 67,
    uploadedAt: '2025-06-10T14:35:00Z',
    status: 'completed',
  },
  {
    id: 'upload-3',
    venueId: 'venue-1',
    source: 'admin',
    fileName: 'admin_report_june.xlsx',
    fileSize: 532480,
    rowCount: 38,
    uploadedAt: '2025-06-10T14:40:00Z',
    status: 'completed',
  },
  {
    id: 'upload-4',
    venueId: 'venue-2',
    source: 'iiko',
    fileName: 'bistro_invoices_june.xlsx',
    fileSize: 122880,
    rowCount: 23,
    uploadedAt: '2025-06-10T15:00:00Z',
    status: 'completed',
  },
  {
    id: 'upload-5',
    venueId: 'venue-3',
    source: 'bank',
    fileName: 'bank_cocktail_june.csv',
    fileSize: 98304,
    rowCount: 31,
    uploadedAt: '2025-06-10T15:20:00Z',
    status: 'completed',
  },
]

export const mockDeduplicationLog: DeduplicationLogEntry[] = []
