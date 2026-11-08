import type { Transaction } from '@/types'

export interface DemoDataset {
  transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'status'>>
  initialCash: {
    monthKey: string
    amount: number
    bankBalance: number
    safeBalance: number
    shiftBalance: number
  }
  menuItems: Array<{
    name: string
    category: string
    period: string
    sellingPrice: number
    standardCost: number
    actualCost: number
    salesVolume: number
    matrixCategory: string
    abcRevenue: string
    xyzStability: string
    foodCostPercent: number
    margin: number
  }>
}

export function generateDemoDataset(venueId: string): DemoDataset {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const monthKey = `${year}-${month}`

  const pad = (n: number) => String(n).padStart(2, '0')

  // Generate 25 realistic restaurant transactions covering income, food, bar, salary, rent, marketing
  const transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'status'>> = [
    // Revenue & Overlapping Acquiring (Deduplication candidates)
    {
      venueId,
      source: 'iiko',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 2))}`,
      amount: 184500,
      type: 'income',
      category: 'other',
      counterparty: 'Касса iiko Главный Зал',
      description: 'Z-отчет вечерняя смена (выручка)',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 3))}`,
      amount: 184500,
      type: 'income',
      category: 'other',
      counterparty: 'АО Т-Банк Эквайринг',
      description: 'Возмещение по операциям эквайринга за смену',
    },
    {
      venueId,
      source: 'iiko',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 4))}`,
      amount: 215000,
      type: 'income',
      category: 'other',
      counterparty: 'Касса iiko Веранда',
      description: 'Выручка кассовой смены суббота',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 5))}`,
      amount: 212500,
      type: 'income',
      category: 'other',
      counterparty: 'АО Т-Банк Эквайринг',
      description: 'Поступление средств по эквайрингу (комиссия 1.15%)',
    },

    // Food Cost Expenses (Suppliers)
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 6))}`,
      amount: 68500,
      type: 'expense',
      category: 'food',
      counterparty: 'ООО "Мясоторг"',
      description: 'Оплата по сч. 482 отрез мраморной говядины',
    },
    {
      venueId,
      source: 'admin',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 6))}`,
      amount: 68500,
      type: 'expense',
      category: 'food',
      counterparty: 'МЯСОТОРГ ООО',
      description: 'Приходная накладная №482 мраморная говядина Black Angus',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 7))}`,
      amount: 24300,
      type: 'expense',
      category: 'food',
      counterparty: 'ИП Ахмедов А.Г.',
      description: 'Свежие овощи и зелень (томаты, базилик, микрозелень)',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 8))}`,
      amount: 45200,
      type: 'expense',
      category: 'food',
      counterparty: 'ООО "Рыбный Дом"',
      description: 'Лосось охлажденный и морепродукты',
    },
    {
      venueId,
      source: 'manual',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 9))}`,
      amount: 14800,
      type: 'expense',
      category: 'food',
      counterparty: 'Даниловский рынок (наличные)',
      description: 'Срочный дозакуп ягод и фермерских сыров',
    },

    // Bar Expenses
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 10))}`,
      amount: 54000,
      type: 'expense',
      category: 'bar',
      counterparty: 'Simple Wine Distribution',
      description: 'Вина Италии и Франции для винной карты',
    },
    {
      venueId,
      source: 'admin',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 10))}`,
      amount: 54000,
      type: 'expense',
      category: 'bar',
      counterparty: 'ООО "Симпл Вайн"',
      description: 'Накладная поставка вина в бар',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 11))}`,
      amount: 32000,
      type: 'expense',
      category: 'bar',
      counterparty: 'Luding Group',
      description: 'Крепкий алкоголь и ликеры для коктейлей',
    },

    // Payroll (ФОТ)
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 12))}`,
      amount: 145000,
      type: 'expense',
      category: 'salary',
      counterparty: 'Зарплатный реестр (Аванс)',
      description: 'Выплата аванса персоналу кухни и зала',
    },
    {
      venueId,
      source: 'manual',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 13))}`,
      amount: 28000,
      type: 'expense',
      category: 'salary',
      counterparty: 'Стажеры и клининг (наличные)',
      description: 'Сменная оплата банкетных официантов',
    },

    // Rent & Utilities
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 14))}`,
      amount: 180000,
      type: 'expense',
      category: 'rent',
      counterparty: 'ООO "Аренда-Сити"',
      description: 'Аренда нежилого помещения за текущий месяц',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 15))}`,
      amount: 38400,
      type: 'expense',
      category: 'utilities',
      counterparty: 'АО Мосэнергосбыт',
      description: 'Электроэнергия силовое ресторанное оборудование',
    },

    // Marketing & Household
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 16))}`,
      amount: 22000,
      type: 'expense',
      category: 'marketing',
      counterparty: 'Яндекс Бизнес',
      description: 'Продвижение на Яндекс Картах и геореклама',
    },
    {
      venueId,
      source: 'bank',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 17))}`,
      amount: 16500,
      type: 'expense',
      category: 'household',
      counterparty: 'ООО КлинТек Про',
      description: 'Профессиональная ресторанная химия и салфетки',
    },

    // Additional Daily Revenues
    {
      venueId,
      source: 'iiko',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 18))}`,
      amount: 167000,
      type: 'income',
      category: 'other',
      counterparty: 'Касса iiko Главный Зал',
      description: 'Z-отчет воскресенье выручка',
    },
    {
      venueId,
      source: 'iiko',
      date: `${year}-${month}-${pad(Math.min(now.getDate(), 19))}`,
      amount: 142000,
      type: 'income',
      category: 'other',
      counterparty: 'Касса iiko Главный Зал',
      description: 'Z-отчет понедельник выручка',
    },
  ]

  const initialCash = {
    monthKey,
    amount: 1155000,
    bankBalance: 850000,
    safeBalance: 240000,
    shiftBalance: 65000,
  }

  const menuItems = [
    {
      name: 'Стейк Рибай Прайм',
      category: 'kitchen',
      period: monthKey,
      sellingPrice: 2800,
      standardCost: 850,
      actualCost: 910,
      salesVolume: 140,
      matrixCategory: 'star',
      abcRevenue: 'A',
      xyzStability: 'X',
      foodCostPercent: 32.5,
      margin: 1890,
    },
    {
      name: 'Бургер Black Angus',
      category: 'kitchen',
      period: monthKey,
      sellingPrice: 790,
      standardCost: 210,
      actualCost: 225,
      salesVolume: 420,
      matrixCategory: 'plowhorse',
      abcRevenue: 'A',
      xyzStability: 'X',
      foodCostPercent: 28.5,
      margin: 565,
    },
    {
      name: 'Коктейль Basil Smash',
      category: 'bar',
      period: monthKey,
      sellingPrice: 650,
      standardCost: 120,
      actualCost: 130,
      salesVolume: 360,
      matrixCategory: 'star',
      abcRevenue: 'A',
      xyzStability: 'X',
      foodCostPercent: 20.0,
      margin: 520,
    },
    {
      name: 'Тирамису Классический',
      category: 'dessert',
      period: monthKey,
      sellingPrice: 480,
      standardCost: 110,
      actualCost: 120,
      salesVolume: 85,
      matrixCategory: 'puzzle',
      abcRevenue: 'B',
      xyzStability: 'Y',
      foodCostPercent: 25.0,
      margin: 360,
    },
    {
      name: 'Салат Оливье с перепелкой',
      category: 'kitchen',
      period: monthKey,
      sellingPrice: 560,
      standardCost: 195,
      actualCost: 245,
      salesVolume: 45,
      matrixCategory: 'dog',
      abcRevenue: 'C',
      xyzStability: 'Z',
      foodCostPercent: 43.7,
      margin: 315,
    },
  ]

  return { transactions, initialCash, menuItems }
}
