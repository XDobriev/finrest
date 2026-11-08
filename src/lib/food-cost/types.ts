export type MenuMatrixCategory = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export type AbcCategory = 'A' | 'B' | 'C'

export type XyzCategory = 'X' | 'Y' | 'Z'

export type FoodCostVarianceStatus = 'NORMAL' | 'WARNING' | 'CRITICAL'

export interface MenuItemInput {
  id?: string
  name: string
  category: string // 'kitchen' | 'bar' | 'dessert' | 'other'
  sellingPrice: number
  standardCost: number // нормативная себестоимость (техкарта)
  actualCost: number   // фактическая себестоимость (факт закупки/списания)
  salesVolume: number  // количество проданных порций
  dailySales?: number[]
  period?: string
}

export interface FoodCostVarianceResult {
  standardFoodCostPercent: number
  actualFoodCostPercent: number
  variancePercent: number
  varianceAmount: number
  status: FoodCostVarianceStatus
}

export interface AnalyzedMenuItem extends MenuItemInput {
  margin: number
  totalRevenue: number
  totalStandardCost: number
  totalActualCost: number
  standardFoodCostPercent: number
  actualFoodCostPercent: number
  variancePercent: number
  varianceAmount: number
  varianceStatus: FoodCostVarianceStatus
  matrixCategory: MenuMatrixCategory
  matrixCategoryLabel: string
  abcCategory: AbcCategory
  xyzCategory: XyzCategory
  recommendation: string
}

export interface MenuRecommendation {
  type: 'star' | 'plowhorse' | 'puzzle' | 'dog' | 'foodcost_warning' | 'foodcost_critical'
  title: string
  description: string
  priority: 'high' | 'medium' | 'info'
}

export interface MenuEngineeringSummary {
  totalMenuItems: number
  totalRevenue: number
  totalStandardFoodCost: number
  totalActualFoodCost: number
  overallStandardFoodCostPercent: number
  overallActualFoodCostPercent: number
  totalFoodCostLoss: number
  starsCount: number
  plowhorsesCount: number
  puzzlesCount: number
  dogsCount: number
  criticalVariancesCount: number
  recommendations: MenuRecommendation[]
}
