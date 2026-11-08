import type {
  MenuItemInput,
  AnalyzedMenuItem,
  MenuMatrixCategory,
  AbcCategory,
  XyzCategory,
  FoodCostVarianceResult,
  MenuRecommendation,
  MenuEngineeringSummary,
} from './types'

export const MATRIX_LABELS: Record<MenuMatrixCategory, string> = {
  star: 'Звезда (Высокая маржа / Высокий спрос)',
  plowhorse: 'Рабочая лошадка (Низкая маржа / Высокий спрос)',
  puzzle: 'Загадка (Высокая маржа / Низкий спрос)',
  dog: 'Собака (Низкая маржа / Низкий спрос)',
}

export function classifyKasavanaSmith(
  items: MenuItemInput[]
): Map<string, MenuMatrixCategory> {
  const result = new Map<string, MenuMatrixCategory>()
  if (items.length === 0) return result

  let totalMargin = 0
  let totalVolume = 0

  for (const item of items) {
    const margin = item.sellingPrice - item.standardCost
    totalMargin += margin
    totalVolume += item.salesVolume
  }

  const avgMargin = totalMargin / items.length
  // Standard Kasavana-Smith threshold is 70% of average sales volume per item
  const volumeHurdle = (totalVolume / items.length) * 0.70

  for (const item of items) {
    const key = item.id || item.name
    const margin = item.sellingPrice - item.standardCost
    const isHighMargin = margin >= avgMargin
    const isHighVolume = item.salesVolume >= volumeHurdle

    if (isHighVolume && isHighMargin) {
      result.set(key, 'star')
    } else if (isHighVolume && !isHighMargin) {
      result.set(key, 'plowhorse')
    } else if (!isHighVolume && isHighMargin) {
      result.set(key, 'puzzle')
    } else {
      result.set(key, 'dog')
    }
  }

  return result
}

export function calculateAbc(
  items: MenuItemInput[]
): Map<string, AbcCategory> {
  const result = new Map<string, AbcCategory>()
  if (items.length === 0) return result

  const revenues = items.map((item) => ({
    key: item.id || item.name,
    revenue: item.sellingPrice * item.salesVolume,
  }))

  const totalRevenue = revenues.reduce((sum, r) => sum + r.revenue, 0)
  if (totalRevenue === 0) {
    for (const item of items) {
      result.set(item.id || item.name, 'C')
    }
    return result
  }

  // Sort descending by revenue
  revenues.sort((a, b) => b.revenue - a.revenue)

  let cumulativeRevenue = 0
  for (const r of revenues) {
    cumulativeRevenue += r.revenue
    const share = cumulativeRevenue / totalRevenue

    if (share <= 0.801) {
      result.set(r.key, 'A')
    } else if (share <= 0.951) {
      result.set(r.key, 'B')
    } else {
      result.set(r.key, 'C')
    }
  }

  return result
}

export function calculateXyz(
  items: MenuItemInput[]
): Map<string, XyzCategory> {
  const result = new Map<string, XyzCategory>()

  for (const item of items) {
    const key = item.id || item.name

    if (item.dailySales && item.dailySales.length >= 2) {
      const n = item.dailySales.length
      const mean = item.dailySales.reduce((a, b) => a + b, 0) / n
      if (mean > 0) {
        const variance =
          item.dailySales.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n
        const stdDev = Math.sqrt(variance)
        const cv = stdDev / mean // Coefficient of variation

        if (cv < 0.10) {
          result.set(key, 'X')
        } else if (cv <= 0.25) {
          result.set(key, 'Y')
        } else {
          result.set(key, 'Z')
        }
        continue
      }
    }

    // Default heuristic if historical daily series is missing:
    if (item.salesVolume > 200) {
      result.set(key, 'X')
    } else if (item.salesVolume > 50) {
      result.set(key, 'Y')
    } else {
      result.set(key, 'Z')
    }
  }

  return result
}

export function calculateFoodCostVariance(
  item: MenuItemInput
): FoodCostVarianceResult {
  const price = item.sellingPrice || 1
  const standardFoodCostPercent = Math.round((item.standardCost / price) * 1000) / 10
  const actualFoodCostPercent = Math.round((item.actualCost / price) * 1000) / 10
  const variancePercent = Math.round((actualFoodCostPercent - standardFoodCostPercent) * 10) / 10
  const varianceAmount = (item.actualCost - item.standardCost) * item.salesVolume

  let status: FoodCostVarianceResult['status'] = 'NORMAL'
  if (variancePercent > 5) {
    status = 'CRITICAL'
  } else if (variancePercent > 2) {
    status = 'WARNING'
  }

  return {
    standardFoodCostPercent,
    actualFoodCostPercent,
    variancePercent,
    varianceAmount,
    status,
  }
}

export function generateMenuRecommendations(
  analyzedItems: AnalyzedMenuItem[]
): MenuRecommendation[] {
  const recommendations: MenuRecommendation[] = []

  // 1. Check critical food cost variances
  for (const item of analyzedItems) {
    if (item.varianceStatus === 'CRITICAL' && item.varianceAmount > 0) {
      recommendations.push({
        type: 'foodcost_critical',
        title: `Критический перерасход: ${item.name}`,
        description: `Фактический фудкост блюда «${item.name}» (${item.actualFoodCostPercent}%) превышает нормативный (${item.standardFoodCostPercent}%) на +${item.variancePercent}%. Критический перерасход составляет ${item.varianceAmount.toLocaleString('ru-RU')} ₽. Проверьте граммовку порций на кухне и отходы при разделке.`,
        priority: 'high',
      })
    }
  }

  // 2. Check Plowhorses (high volume, low margin)
  for (const item of analyzedItems) {
    if (item.matrixCategory === 'plowhorse') {
      recommendations.push({
        type: 'plowhorse',
        title: `Оптимизация маржи: ${item.name}`,
        description: `Блюдо «${item.name}» — «Рабочая лошадка» с высоким спросом (${item.salesVolume} шт), но низкой маржой (${item.margin.toLocaleString('ru-RU')} ₽). Рекомендуется аккуратное повышение цены на 5–10% или замена дорогостоящих ингредиентов гарнира без ущерба вкусу.`,
        priority: 'medium',
      })
    }
  }

  // 3. Check Puzzles (low volume, high margin)
  for (const item of analyzedItems) {
    if (item.matrixCategory === 'puzzle') {
      recommendations.push({
        type: 'puzzle',
        title: `Продвижение маржинального блюда: ${item.name}`,
        description: `Блюдо «${item.name}» приносит высокую чистую маржу (${item.margin.toLocaleString('ru-RU')} ₽), но гости заказывают его редко (${item.salesVolume} шт). Поставьте его в спецпредложение официантам («Блюдо дня») и выделите визуально в меню.`,
        priority: 'medium',
      })
    }
  }

  // 4. Check Dogs (low volume, low margin)
  for (const item of analyzedItems) {
    if (item.matrixCategory === 'dog') {
      recommendations.push({
        type: 'dog',
        title: `Кандидат на вывод: ${item.name}`,
        description: `Блюдо «${item.name}» классифицировано как «Собака» (низкий спрос и низкая маржа). Занимает складские запасы и время повара. Рекомендуется вывести из меню при ближайшем обновлении или заменить сезонной новинкой.`,
        priority: 'info',
      })
    }
  }

  return recommendations
}

export function analyzeMenu(items: MenuItemInput[]): {
  items: AnalyzedMenuItem[]
  summary: MenuEngineeringSummary
} {
  const matrixMap = classifyKasavanaSmith(items)
  const abcMap = calculateAbc(items)
  const xyzMap = calculateXyz(items)

  let totalRevenue = 0
  let totalStandardFoodCost = 0
  let totalActualFoodCost = 0
  let totalFoodCostLoss = 0
  let starsCount = 0
  let plowhorsesCount = 0
  let puzzlesCount = 0
  let dogsCount = 0
  let criticalVariancesCount = 0

  const analyzedItems: AnalyzedMenuItem[] = items.map((item) => {
    const key = item.id || item.name
    const matrixCategory = matrixMap.get(key) || 'dog'
    const abcCategory = abcMap.get(key) || 'C'
    const xyzCategory = xyzMap.get(key) || 'Z'
    const variance = calculateFoodCostVariance(item)

    const margin = item.sellingPrice - item.standardCost
    const totalRev = item.sellingPrice * item.salesVolume
    const totalStdCost = item.standardCost * item.salesVolume
    const totalActCost = item.actualCost * item.salesVolume

    totalRevenue += totalRev
    totalStandardFoodCost += totalStdCost
    totalActualFoodCost += totalActCost

    if (variance.varianceAmount > 0) {
      totalFoodCostLoss += variance.varianceAmount
    }

    if (matrixCategory === 'star') starsCount++
    else if (matrixCategory === 'plowhorse') plowhorsesCount++
    else if (matrixCategory === 'puzzle') puzzlesCount++
    else if (matrixCategory === 'dog') dogsCount++

    if (variance.status === 'CRITICAL') {
      criticalVariancesCount++
    }

    let recommendation = ''
    if (matrixCategory === 'star') {
      recommendation = 'Сохранять неизменным качество, топовая позиция'
    } else if (matrixCategory === 'plowhorse') {
      recommendation = 'Повысить цену на 5-10% или оптимизировать себестоимость'
    } else if (matrixCategory === 'puzzle') {
      recommendation = 'Стимулировать продажи через рекомендации официантов'
    } else {
      recommendation = 'Рассмотреть вывод из основного меню'
    }

    return {
      ...item,
      margin,
      totalRevenue: totalRev,
      totalStandardCost: totalStdCost,
      totalActualCost: totalActCost,
      standardFoodCostPercent: variance.standardFoodCostPercent,
      actualFoodCostPercent: variance.actualFoodCostPercent,
      variancePercent: variance.variancePercent,
      varianceAmount: variance.varianceAmount,
      varianceStatus: variance.status,
      matrixCategory,
      matrixCategoryLabel: MATRIX_LABELS[matrixCategory],
      abcCategory,
      xyzCategory,
      recommendation,
    }
  })

  const overallStandardFoodCostPercent =
    totalRevenue > 0
      ? Math.round((totalStandardFoodCost / totalRevenue) * 1000) / 10
      : 0
  const overallActualFoodCostPercent =
    totalRevenue > 0
      ? Math.round((totalActualFoodCost / totalRevenue) * 1000) / 10
      : 0

  const recommendations = generateMenuRecommendations(analyzedItems)

  const summary: MenuEngineeringSummary = {
    totalMenuItems: items.length,
    totalRevenue,
    totalStandardFoodCost,
    totalActualFoodCost,
    overallStandardFoodCostPercent,
    overallActualFoodCostPercent,
    totalFoodCostLoss,
    starsCount,
    plowhorsesCount,
    puzzlesCount,
    dogsCount,
    criticalVariancesCount,
    recommendations,
  }

  return {
    items: analyzedItems,
    summary,
  }
}
