import type { ExpenseCategory } from '@/types'

interface Rule {
  category: ExpenseCategory
  keywords: string[]
}

const CATEGORY_RULES: Rule[] = [
  {
    category: 'salary',
    keywords: [
      'зарплат',
      'аванс',
      'фот',
      'выплат',
      'вознагражден',
      'персонал',
      'сотрудник',
      'оклад',
      'преми',
      'ндфл',
      'страхов',
      'пенсион',
    ],
  },
  {
    category: 'rent',
    keywords: ['аренд', 'субаренд', 'найм помещен', 'помещени', 'арендодател'],
  },
  {
    category: 'utilities',
    keywords: [
      'коммунал',
      'электроэнерг',
      'водоканал',
      'энергосбыт',
      'теплосет',
      'газпром',
      'отоплен',
      'водоснабжен',
      'тко',
      'вывоз мусор',
      'жкх',
      'мосэнерго',
    ],
  },
  {
    category: 'bar',
    keywords: [
      'алко',
      'пиво',
      'вин',
      'водк',
      'коктейл',
      'кофе',
      'сироп',
      'напитк',
      'ликер',
      'виски',
      'коньяк',
      'чай',
      'бар',
      'алкоснаб',
      'симпл',
      'лудинг',
      'энотека',
    ],
  },
  {
    category: 'food',
    keywords: [
      'продукт',
      'мяс',
      'рыб',
      'овощ',
      'фрукт',
      'молок',
      'сыр',
      'хлеб',
      'зелен',
      'мук',
      'птиц',
      'куриц',
      'говядин',
      'свинин',
      'бакале',
      'фуд',
      'снаб',
      'агро',
      'мясоснаб',
      'молокопродукт',
      'мироторг',
      'мираторг',
      'метро',
      'ашан',
      'фудмаркет',
      'мясокомбинат',
    ],
  },
  {
    category: 'household',
    keywords: [
      'хоз',
      'моюще',
      'салфетк',
      'бумаг',
      'перчатк',
      'упаковк',
      'контейнер',
      'пакет',
      'чистк',
      'бытов',
      'дезинфекц',
      'хозторг',
      'комус',
      'чистота',
    ],
  },
  {
    category: 'marketing',
    keywords: [
      'реклам',
      'маркетинг',
      'директ',
      'яндекс',
      'таргет',
      'полиграфи',
      'буклет',
      'меню',
      'дизайн',
      'продвижен',
      'smm',
      'блогер',
      'баннер',
    ],
  },
  {
    category: 'services',
    keywords: [
      'услуг',
      'обслуживан',
      'ремонт',
      'охрана',
      'интернет',
      'связь',
      'провайдер',
      'эквайринг',
      'комисси',
      'программ',
      'iiko',
      'айко',
      'кипер',
      'софт',
      'бухгалтер',
      'аудит',
      'юрист',
      'нотариус',
      'доставк',
      'транспорт',
    ],
  },
]

export function categorizeTransaction(
  counterparty: string,
  description: string
): ExpenseCategory {
  const text = `${counterparty} ${description}`.toLowerCase()

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        return rule.category
      }
    }
  }

  return 'other'
}

export function detectTransactionType(
  description: string,
  amount: number,
  isRecipientOurVenue: boolean
): 'income' | 'expense' {
  if (isRecipientOurVenue) return 'income'

  const lowerDesc = description.toLowerCase()

  // Guard: bank commissions and deductions are always expenses, even if mentioning acquiring/terminals
  const feeKeywords = [
    'комисс',
    'удержан',
    'списан',
    'плата за',
    'тариф',
    'обслуживан',
    'ррб',
    'инкассац',
  ]
  if (feeKeywords.some((kw) => lowerDesc.includes(kw))) {
    return 'expense'
  }

  const incomeKeywords = [
    'выручк',
    'эквайринг',
    'поступлен',
    'оплата от покупател',
    'терминал',
    'возврат от поставщик',
    'зачислени',
    'возмещени',
  ]

  for (const kw of incomeKeywords) {
    if (lowerDesc.includes(kw)) {
      return 'income'
    }
  }

  return 'expense'
}
