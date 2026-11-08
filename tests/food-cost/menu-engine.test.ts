import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeMenu,
  classifyKasavanaSmith,
  calculateAbc,
  calculateXyz,
  calculateFoodCostVariance,
} from '../../src/lib/food-cost/engine'
import type { MenuItemInput } from '../../src/lib/food-cost/types'
import { prisma } from '../../src/lib/db/client'
import {
  getMenuItemsAction,
  saveMenuItemAction,
  getMenuAnalysisAction,
  seedDefaultMenuAction,
} from '../../src/app/actions/menu'

const sampleMenuItems: MenuItemInput[] = [
  {
    id: 'item-1',
    name: 'Стейк Рибай Прайм',
    category: 'kitchen',
    sellingPrice: 2800,
    standardCost: 840,   // 30% standard FC, margin = 1960
    actualCost: 1120,    // 40% actual FC (critical variance +10%)
    salesVolume: 240,    // High demand
    dailySales: [30, 32, 28, 35, 31, 33, 29], // low variation (X)
  },
  {
    id: 'item-2',
    name: 'Борщ с говядиной и пампушками',
    category: 'kitchen',
    sellingPrice: 550,
    standardCost: 165,   // margin = 385 (Low margin in rubles)
    actualCost: 175,     // slight variance
    salesVolume: 650,    // Very high demand -> Plowhorse
    dailySales: [90, 88, 95, 92, 89, 91, 94], // X
  },
  {
    id: 'item-3',
    name: 'Трюфельное ризотто с белыми грибами',
    category: 'kitchen',
    sellingPrice: 1450,
    standardCost: 360,   // margin = 1090 (High margin)
    actualCost: 370,
    salesVolume: 45,     // Low demand -> Puzzle
    dailySales: [5, 12, 2, 8, 3, 10, 4], // high variation (Z)
  },
  {
    id: 'item-4',
    name: 'Овсяная каша на воде с ягодами',
    category: 'kitchen',
    sellingPrice: 320,
    standardCost: 140,   // margin = 180 (Low margin)
    actualCost: 150,
    salesVolume: 30,     // Low demand -> Dog
    dailySales: [4, 5, 3, 6, 4, 3, 5],
  },
]

test('Kasavana-Smith Matrix: accurately classifies Stars, Plowhorses, Puzzles, and Dogs', () => {
  const matrixMap = classifyKasavanaSmith(sampleMenuItems)

  assert.equal(matrixMap.get('item-1'), 'star', 'Стейк Рибай: high demand + high ruble margin -> Star')
  assert.equal(matrixMap.get('item-2'), 'plowhorse', 'Борщ: high demand + low ruble margin -> Plowhorse')
  assert.equal(matrixMap.get('item-3'), 'puzzle', 'Трюфельное ризотто: low demand + high ruble margin -> Puzzle')
  assert.equal(matrixMap.get('item-4'), 'dog', 'Овсяная каша: low demand + low ruble margin -> Dog')
})

test('ABC Analysis: categorizes revenue share into A (80%), B (15%), and C (5%)', () => {
  const abcMap = calculateAbc(sampleMenuItems)

  // Total revenues:
  // Item 1: 2800 * 240 = 672,000
  // Item 2: 550 * 650 = 357,500
  // Item 3: 1450 * 45 = 65,250
  // Item 4: 320 * 30 = 9,600
  // Total = 1,104,350
  // Item 1 = 60.8% -> A
  // Item 2 = 32.4% -> A or B
  // Item 4 = < 1% -> C

  assert.equal(abcMap.get('item-1'), 'A')
  assert.ok(abcMap.get('item-4') === 'C')
})

test('XYZ Analysis: evaluates demand predictability using coefficient of variation', () => {
  const xyzMap = calculateXyz(sampleMenuItems)

  assert.equal(xyzMap.get('item-1'), 'X', 'Stable daily steak sales -> X')
  assert.equal(xyzMap.get('item-2'), 'X', 'Stable daily borsch sales -> X')
  assert.equal(xyzMap.get('item-3'), 'Z', 'Irregular truffle risotto sales -> Z')
})

test('Food Cost Variance Engine: detects over-portioning and critical variance thresholds', () => {
  const steak = sampleMenuItems[0] // 30% standard, 40% actual (+10% variance)
  const variance = calculateFoodCostVariance(steak)

  assert.equal(variance.standardFoodCostPercent, 30)
  assert.equal(variance.actualFoodCostPercent, 40)
  assert.equal(variance.variancePercent, 10)
  assert.equal(variance.status, 'CRITICAL')
  assert.equal(variance.varianceAmount, (1120 - 840) * 240) // 280 * 240 = 67,200 ₽ loss
})

test('Analyze Menu: generates comprehensive summary and actionable recommendations', () => {
  const analysis = analyzeMenu(sampleMenuItems)

  assert.equal(analysis.summary.totalMenuItems, 4)
  assert.equal(analysis.summary.starsCount, 1)
  assert.equal(analysis.summary.plowhorsesCount, 1)
  assert.equal(analysis.summary.puzzlesCount, 1)
  assert.equal(analysis.summary.dogsCount, 1)
  assert.ok(analysis.summary.totalFoodCostLoss > 0)

  // Recommendations check
  const recs = analysis.summary.recommendations
  assert.ok(recs.length >= 2)
  const steakRec = recs.find((r) => r.description.includes('Рибай') || r.description.includes('перерасход'))
  assert.ok(steakRec, 'Should recommend fixing food cost variance for steak')
  const plowhorseRec = recs.find((r) => r.description.includes('Борщ') || r.description.includes('повышение цен') || r.description.includes('оптимиз'))
  assert.ok(plowhorseRec, 'Should recommend optimizing plowhorse')
})

test('Menu Server Actions: seed, list, save, and analysis lifecycle', async () => {
  const user = await prisma.user.create({
    data: { email: `menu_action_${Date.now()}@finrest.ru`, name: 'Chef Menu Owner' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Ресторан Меню Тест', ownerId: user.id },
  })

  try {
    // 1. Seed default realistic HoReCa menu items
    const seeded = await seedDefaultMenuAction(venue.id, '2026-11')
    assert.ok(seeded.length >= 6, 'Should seed at least 6 representative menu items')

    // 2. Fetch menu items
    const items = await getMenuItemsAction(venue.id, '2026-11')
    assert.equal(items.length, seeded.length)

    // 3. Save a custom item
    const newItem = await saveMenuItemAction(venue.id, {
      name: 'Медовик с соленой карамелью',
      category: 'dessert',
      sellingPrice: 480,
      standardCost: 96,
      actualCost: 105,
      salesVolume: 120,
    })
    assert.ok(newItem.id)

    // 4. Run Menu Analysis action
    const analysis = await getMenuAnalysisAction(venue.id, '2026-11')
    assert.ok(analysis.items.length >= 7)
    assert.ok(analysis.summary.totalRevenue > 0)
    assert.ok(analysis.summary.starsCount >= 1)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})
