# Management Balance Sheet & Working Capital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 3rd pillar of restaurant financial accounting — Management Balance Sheet (Управленческий баланс), Working Capital ($NWC$), and Safe Dividend Calculator in FinRest.

**Architecture:** Extend Prisma schema with `BalanceSnapshot`, implement a pure financial calculation engine in `src/lib/reports/balance.ts`, create typed repository and Next.js Server Actions with JWT auth, build a high-contrast Radix/Tailwind UI report with fast-close monthly snapshots, and provide Excel export.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 7, PostgreSQL 17, Tailwind CSS v4, Radix UI, XLSX, Node.js Test Runner (`node:test`).

---

### Task 1: Prisma Schema Model & Type Definitions

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update Prisma schema with `BalanceSnapshot` model**

In `prisma/schema.prisma`, add `balanceSnapshots BalanceSnapshot[]` to `model Venue`:
```prisma
model Venue {
  // ... existing fields
  balanceSnapshots BalanceSnapshot[]
}
```

Add the `BalanceSnapshot` model at the bottom of `prisma/schema.prisma`:
```prisma
model BalanceSnapshot {
  id                 String   @id @default(cuid())
  venueId            String
  venue              Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  monthKey           String   // e.g. "2026-11"

  cashAmount         Float    @default(0)
  inventoryFood      Float    @default(0)
  inventoryBar       Float    @default(0)
  accountsReceivable Float    @default(0)

  accountsPayable    Float    @default(0)
  payrollPayable     Float    @default(0)
  taxesPayable       Float    @default(0)
  guestPrepayments   Float    @default(0)

  safetyReserveDays  Int      @default(10)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([venueId, monthKey])
  @@index([venueId])
}
```

- [ ] **Step 2: Add TypeScript types in `src/types/index.ts`**

Append to `src/types/index.ts`:
```typescript
export interface BalanceSnapshot {
  id: string
  venueId: string
  monthKey: string
  cashAmount: number
  inventoryFood: number
  inventoryBar: number
  accountsReceivable: number
  accountsPayable: number
  payrollPayable: number
  taxesPayable: number
  guestPrepayments: number
  safetyReserveDays: number
  createdAt: string
  updatedAt: string
}

export type LiquidityStatus = 'healthy' | 'warning' | 'critical'

export interface BalanceReportData {
  venueName: string
  monthKey: string
  period: string
  assets: {
    cashAmount: number
    inventoryFood: number
    inventoryBar: number
    accountsReceivable: number
    totalCurrentAssets: number
  }
  liabilities: {
    accountsPayable: number
    payrollPayable: number
    taxesPayable: number
    guestPrepayments: number
    totalCurrentLiabilities: number
  }
  workingCapital: {
    nwc: number
    currentRatio: number
    liquidityStatus: LiquidityStatus
    liquidityLabel: string
  }
  safeDividends: {
    dailyOpex: number
    safetyReserveDays: number
    safetyBuffer: number
    maxSafeDividend: number
    isSafe: boolean
    deficitAmount: number
  }
}

export interface UpsertBalanceInput {
  venueId: string
  monthKey: string
  cashAmount: number
  inventoryFood: number
  inventoryBar: number
  accountsReceivable: number
  accountsPayable: number
  payrollPayable: number
  taxesPayable: number
  guestPrepayments: number
  safetyReserveDays?: number
}
```

- [ ] **Step 3: Run prisma db push and generate client**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx prisma db push && npx prisma generate`
Expected: Database in sync, `@prisma/client` updated with `BalanceSnapshot`.

- [ ] **Step 4: Verify typecheck passes**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsc --noEmit`
Expected: Clean exit code 0.

- [ ] **Step 5: Commit schema and types**

```bash
cd /Users/fatima/Desktop/Khamzat/finrest
git add prisma/schema.prisma src/types/index.ts
git commit -m "feat(balance): add BalanceSnapshot prisma model and typescript definitions"
```

---

### Task 2: Pure Financial Calculation Engine (TDD)

**Files:**
- Create: `tests/reports/balance-calc.test.ts`
- Create: `src/lib/reports/balance.ts`

- [ ] **Step 1: Write failing tests for Balance Sheet calculations**

Create `tests/reports/balance-calc.test.ts`:
```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateBalanceReportData } from '../../src/lib/reports/balance'
import type { BalanceSnapshot } from '../../src/types'

const sampleSnapshot: BalanceSnapshot = {
  id: 'snap-1',
  venueId: 'venue-1',
  monthKey: '2026-11',
  cashAmount: 1800000,
  inventoryFood: 450000,
  inventoryBar: 350000,
  accountsReceivable: 200000,
  accountsPayable: 900000,
  payrollPayable: 600000,
  taxesPayable: 150000,
  guestPrepayments: 150000,
  safetyReserveDays: 10,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
}

test('Balance Engine: calculates total assets, liabilities and NWC correctly', () => {
  const result = calculateBalanceReportData({
    snapshot: sampleSnapshot,
    monthlyOpex: 1200000,
    venueName: 'Ресторан Центр',
    period: 'Ноябрь 2026',
  })

  // Total Assets: 1800k + 450k + 350k + 200k = 2800k
  assert.equal(result.assets.totalCurrentAssets, 2800000)
  // Total Liabilities: 900k + 600k + 150k + 150k = 1800k
  assert.equal(result.liabilities.totalCurrentLiabilities, 1800000)
  // NWC: 2800k - 1800k = 1000k
  assert.equal(result.workingCapital.nwc, 1000000)
  // Current Ratio: 2800k / 1800k = 1.56
  assert.equal(Math.round(result.workingCapital.currentRatio * 100) / 100, 1.56)
  assert.equal(result.workingCapital.liquidityStatus, 'healthy')
})

test('Balance Engine: calculates safe dividends with operating reserve buffer', () => {
  // monthlyOpex = 1200k => daily = 40k. 10 reserve days buffer = 400k.
  // Cash (1800k) - Liabilities (1800k) - Buffer (400k) = -400k (Deficit!)
  const result = calculateBalanceReportData({
    snapshot: sampleSnapshot,
    monthlyOpex: 1200000,
    venueName: 'Ресторан Центр',
    period: 'Ноябрь 2026',
  })

  assert.equal(result.safeDividends.dailyOpex, 40000)
  assert.equal(result.safeDividends.safetyBuffer, 400000)
  assert.equal(result.safeDividends.isSafe, false)
  assert.equal(result.safeDividends.maxSafeDividend, 0)
  assert.equal(result.safeDividends.deficitAmount, 400000)
})

test('Balance Engine: allows dividends when free cash exceeds buffer and liabilities', () => {
  const richSnapshot: BalanceSnapshot = {
    ...sampleSnapshot,
    cashAmount: 3000000, // 3000k cash - 1800k liab - 400k buffer = 800k safe
  }
  const result = calculateBalanceReportData({
    snapshot: richSnapshot,
    monthlyOpex: 1200000,
    venueName: 'Ресторан Центр',
    period: 'Ноябрь 2026',
  })

  assert.equal(result.safeDividends.isSafe, true)
  assert.equal(result.safeDividends.maxSafeDividend, 800000)
  assert.equal(result.safeDividends.deficitAmount, 0)
})

test('Balance Engine: safely handles zero liabilities without division by zero', () => {
  const zeroLiabSnapshot: BalanceSnapshot = {
    ...sampleSnapshot,
    accountsPayable: 0,
    payrollPayable: 0,
    taxesPayable: 0,
    guestPrepayments: 0,
  }
  const result = calculateBalanceReportData({
    snapshot: zeroLiabSnapshot,
    monthlyOpex: 300000,
    venueName: 'Ресторан',
    period: 'Ноябрь 2026',
  })

  assert.equal(result.workingCapital.currentRatio, 999)
  assert.equal(result.workingCapital.liquidityStatus, 'healthy')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsx --test tests/reports/balance-calc.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/reports/balance'").

- [ ] **Step 3: Implement `src/lib/reports/balance.ts`**

Create `src/lib/reports/balance.ts`:
```typescript
import type { BalanceSnapshot, BalanceReportData, LiquidityStatus } from '@/types'

export interface CalculateBalanceParams {
  snapshot: BalanceSnapshot
  monthlyOpex: number
  venueName: string
  period: string
}

export function calculateBalanceReportData({
  snapshot,
  monthlyOpex,
  venueName,
  period,
}: CalculateBalanceParams): BalanceReportData {
  const totalCurrentAssets =
    (snapshot.cashAmount || 0) +
    (snapshot.inventoryFood || 0) +
    (snapshot.inventoryBar || 0) +
    (snapshot.accountsReceivable || 0)

  const totalCurrentLiabilities =
    (snapshot.accountsPayable || 0) +
    (snapshot.payrollPayable || 0) +
    (snapshot.taxesPayable || 0) +
    (snapshot.guestPrepayments || 0)

  const nwc = totalCurrentAssets - totalCurrentLiabilities

  let currentRatio: number
  let liquidityStatus: LiquidityStatus
  let liquidityLabel: string

  if (totalCurrentLiabilities === 0) {
    currentRatio = 999
    liquidityStatus = 'healthy'
    liquidityLabel = 'Обязательства отсутствуют'
  } else {
    currentRatio = Math.round((totalCurrentAssets / totalCurrentLiabilities) * 100) / 100
    if (currentRatio >= 1.0) {
      liquidityStatus = 'healthy'
      liquidityLabel = 'Высокая устойчивость'
    } else if (currentRatio >= 0.7) {
      liquidityStatus = 'warning'
      liquidityLabel = 'Умеренный риск (норма HoReCa)'
    } else {
      liquidityStatus = 'critical'
      liquidityLabel = 'Критический риск разрыва'
    }
  }

  const safeDays = Math.max(1, snapshot.safetyReserveDays || 10)
  const dailyOpex = Math.round((Math.max(0, monthlyOpex) / 30) * 100) / 100
  const safetyBuffer = Math.round(dailyOpex * safeDays)

  const netCashSurplus = (snapshot.cashAmount || 0) - totalCurrentLiabilities - safetyBuffer
  const isSafe = netCashSurplus > 0
  const maxSafeDividend = isSafe ? Math.round(netCashSurplus) : 0
  const deficitAmount = isSafe ? 0 : Math.round(Math.abs(netCashSurplus))

  return {
    venueName,
    monthKey: snapshot.monthKey,
    period,
    assets: {
      cashAmount: snapshot.cashAmount || 0,
      inventoryFood: snapshot.inventoryFood || 0,
      inventoryBar: snapshot.inventoryBar || 0,
      accountsReceivable: snapshot.accountsReceivable || 0,
      totalCurrentAssets,
    },
    liabilities: {
      accountsPayable: snapshot.accountsPayable || 0,
      payrollPayable: snapshot.payrollPayable || 0,
      taxesPayable: snapshot.taxesPayable || 0,
      guestPrepayments: snapshot.guestPrepayments || 0,
      totalCurrentLiabilities,
    },
    workingCapital: {
      nwc,
      currentRatio,
      liquidityStatus,
      liquidityLabel,
    },
    safeDividends: {
      dailyOpex,
      safetyReserveDays: safeDays,
      safetyBuffer,
      maxSafeDividend,
      isSafe,
      deficitAmount,
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsx --test tests/reports/balance-calc.test.ts`
Expected: 4 tests pass with 0 failures.

- [ ] **Step 5: Commit calculation engine**

```bash
cd /Users/fatima/Desktop/Khamzat/finrest
git add tests/reports/balance-calc.test.ts src/lib/reports/balance.ts
git commit -m "feat(balance): implement pure balance sheet and safe dividends calculation engine"
```

---

### Task 3: Database Repository & Server Actions (TDD)

**Files:**
- Create: `tests/db/balance.test.ts`
- Create: `src/lib/db/balance.ts`
- Create: `src/app/actions/balance.ts`

- [ ] **Step 1: Write integration test for Balance repository**

Create `tests/db/balance.test.ts`:
```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import { getBalanceSnapshot, upsertBalanceSnapshot } from '../../src/lib/db/balance'
import { prisma } from '../../src/lib/db/client'

test('Balance Repository: calculates default snapshot and persists updates', async () => {
  // 1. Get or create a test venue
  const venue = await prisma.venue.findFirst({
    where: { name: 'Кафе на Арбате' },
  })
  assert.ok(venue, 'Demo venue should exist')

  const monthKey = '2026-11'

  // 2. Initial fetch should return default computed values
  const initialSnapshot = await getBalanceSnapshot(venue.id, monthKey)
  assert.equal(initialSnapshot.venueId, venue.id)
  assert.equal(initialSnapshot.monthKey, monthKey)
  assert.equal(typeof initialSnapshot.cashAmount, 'number')
  assert.equal(typeof initialSnapshot.inventoryFood, 'number')

  // 3. Upsert custom snapshot
  const saved = await upsertBalanceSnapshot({
    venueId: venue.id,
    monthKey,
    cashAmount: 2500000,
    inventoryFood: 300000,
    inventoryBar: 200000,
    accountsReceivable: 100000,
    accountsPayable: 800000,
    payrollPayable: 500000,
    taxesPayable: 120000,
    guestPrepayments: 80000,
    safetyReserveDays: 14,
  })

  assert.equal(saved.cashAmount, 2500000)
  assert.equal(saved.accountsPayable, 800000)
  assert.equal(saved.safetyReserveDays, 14)

  // 4. Fetch again to verify persistence
  const fetched = await getBalanceSnapshot(venue.id, monthKey)
  assert.equal(fetched.cashAmount, 2500000)
  assert.equal(fetched.accountsPayable, 800000)
  assert.equal(fetched.safetyReserveDays, 14)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsx --test tests/db/balance.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/db/balance'").

- [ ] **Step 3: Implement `src/lib/db/balance.ts`**

Create `src/lib/db/balance.ts`:
```typescript
import { prisma } from './client'
import type { BalanceSnapshot, UpsertBalanceInput } from '@/types'
import { getCashBalance } from './cash'
import { getTransactions } from './transactions'
import { getInventoryItems } from './inventory'

export async function getBalanceSnapshot(venueId: string, monthKey: string): Promise<BalanceSnapshot> {
  // Check if an explicit snapshot was already persisted
  const existing = await prisma.balanceSnapshot.findUnique({
    where: {
      venueId_monthKey: { venueId, monthKey },
    },
  })

  if (existing) {
    return {
      id: existing.id,
      venueId: existing.venueId,
      monthKey: existing.monthKey,
      cashAmount: existing.cashAmount,
      inventoryFood: existing.inventoryFood,
      inventoryBar: existing.inventoryBar,
      accountsReceivable: existing.accountsReceivable,
      accountsPayable: existing.accountsPayable,
      payrollPayable: existing.payrollPayable,
      taxesPayable: existing.taxesPayable,
      guestPrepayments: existing.guestPrepayments,
      safetyReserveDays: existing.safetyReserveDays,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
    }
  }

  // Otherwise calculate defaults from DDS and Inventory
  // 1. Cash amount: opening balance + net cash flow
  const openingBalance = await getCashBalance(venueId, monthKey)
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const fromDate = `${monthKey}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const toDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`

  const txs = await getTransactions(venueId, { from: fromDate, to: toDate })
  let netCashFlow = 0
  for (const tx of txs) {
    if (tx.status === 'duplicate') continue
    if (tx.type === 'income') {
      netCashFlow += tx.amount
    } else {
      netCashFlow -= tx.amount
    }
  }
  const defaultCash = Math.max(0, Math.round((openingBalance + netCashFlow) * 100) / 100)

  // 2. Inventory items for monthKey
  const inventoryItems = await getInventoryItems(venueId, monthKey)
  let foodTotal = 0
  let barTotal = 0
  for (const item of inventoryItems) {
    const cost = item.actualQty * item.pricePerUnit
    if (item.category === 'bar') {
      barTotal += cost
    } else {
      foodTotal += cost
    }
  }

  return {
    id: `temp-${venueId}-${monthKey}`,
    venueId,
    monthKey,
    cashAmount: defaultCash,
    inventoryFood: Math.round(foodTotal),
    inventoryBar: Math.round(barTotal),
    accountsReceivable: 0,
    accountsPayable: 0,
    payrollPayable: 0,
    taxesPayable: 0,
    guestPrepayments: 0,
    safetyReserveDays: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function upsertBalanceSnapshot(input: UpsertBalanceInput): Promise<BalanceSnapshot> {
  const result = await prisma.balanceSnapshot.upsert({
    where: {
      venueId_monthKey: { venueId: input.venueId, monthKey: input.monthKey },
    },
    update: {
      cashAmount: input.cashAmount,
      inventoryFood: input.inventoryFood,
      inventoryBar: input.inventoryBar,
      accountsReceivable: input.accountsReceivable,
      accountsPayable: input.accountsPayable,
      payrollPayable: input.payrollPayable,
      taxesPayable: input.taxesPayable,
      guestPrepayments: input.guestPrepayments,
      safetyReserveDays: input.safetyReserveDays ?? 10,
    },
    create: {
      venueId: input.venueId,
      monthKey: input.monthKey,
      cashAmount: input.cashAmount,
      inventoryFood: input.inventoryFood,
      inventoryBar: input.inventoryBar,
      accountsReceivable: input.accountsReceivable,
      accountsPayable: input.accountsPayable,
      payrollPayable: input.payrollPayable,
      taxesPayable: input.taxesPayable,
      guestPrepayments: input.guestPrepayments,
      safetyReserveDays: input.safetyReserveDays ?? 10,
    },
  })

  return {
    id: result.id,
    venueId: result.venueId,
    monthKey: result.monthKey,
    cashAmount: result.cashAmount,
    inventoryFood: result.inventoryFood,
    inventoryBar: result.inventoryBar,
    accountsReceivable: result.accountsReceivable,
    accountsPayable: result.accountsPayable,
    payrollPayable: result.payrollPayable,
    taxesPayable: result.taxesPayable,
    guestPrepayments: result.guestPrepayments,
    safetyReserveDays: result.safetyReserveDays,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }
}
```

- [ ] **Step 4: Implement `src/app/actions/balance.ts`**

Create `src/app/actions/balance.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getBalanceSnapshot, upsertBalanceSnapshot } from '@/lib/db/balance'
import type { BalanceSnapshot, UpsertBalanceInput } from '@/types'

export async function getBalanceSnapshotAction(venueId: string, monthKey: string): Promise<BalanceSnapshot> {
  try {
    return await getBalanceSnapshot(venueId, monthKey)
  } catch (error) {
    console.error('Error in getBalanceSnapshotAction:', error)
    throw new Error('Не удалось загрузить снимок баланса')
  }
}

export async function saveBalanceSnapshotAction(input: UpsertBalanceInput): Promise<{ success: boolean; data?: BalanceSnapshot; error?: string }> {
  try {
    const data = await upsertBalanceSnapshot(input)
    revalidatePath('/reports')
    return { success: true, data }
  } catch (error) {
    console.error('Error in saveBalanceSnapshotAction:', error)
    return { success: false, error: 'Не удалось сохранить снимок баланса' }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsx --test tests/db/balance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit repository and actions**

```bash
cd /Users/fatima/Desktop/Khamzat/finrest
git add tests/db/balance.test.ts src/lib/db/balance.ts src/app/actions/balance.ts
git commit -m "feat(balance): add balance snapshot database repository and server actions"
```

---

### Task 4: Excel Export Generator

**Files:**
- Create: `src/lib/excel/export-balance.ts`

- [ ] **Step 1: Implement `src/lib/excel/export-balance.ts`**

Create `src/lib/excel/export-balance.ts`:
```typescript
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
```

- [ ] **Step 2: Verify typecheck passes**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit Excel export module**

```bash
cd /Users/fatima/Desktop/Khamzat/finrest
git add src/lib/excel/export-balance.ts
git commit -m "feat(balance): add Excel export generator for management balance sheet"
```

---

### Task 5: UI Balance Report Component & Reports Integration

**Files:**
- Create: `src/components/reports/BalanceReport.tsx`
- Modify: `src/app/reports/page.tsx`

- [ ] **Step 1: Implement `src/components/reports/BalanceReport.tsx`**

Create `src/components/reports/BalanceReport.tsx`:
```tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { calculateBalanceReportData } from '@/lib/reports/balance'
import { saveBalanceSnapshotAction } from '@/app/actions/balance'
import type { BalanceSnapshot, BalanceReportData } from '@/types'
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Coins, 
  Save, 
  CheckCircle2, 
  Layers, 
  HelpCircle 
} from 'lucide-react'

interface BalanceReportProps {
  initialSnapshot: BalanceSnapshot
  monthlyOpex: number
  venueName: string
  period: string
  onSnapshotSaved?: (snapshot: BalanceSnapshot) => void
}

export function BalanceReport({
  initialSnapshot,
  monthlyOpex,
  venueName,
  period,
  onSnapshotSaved,
}: BalanceReportProps) {
  const [snapshot, setSnapshot] = useState<BalanceSnapshot>(initialSnapshot)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    setSnapshot(initialSnapshot)
  }, [initialSnapshot])

  const reportData: BalanceReportData = calculateBalanceReportData({
    snapshot,
    monthlyOpex,
    venueName,
    period,
  })

  const handleFieldChange = (field: keyof BalanceSnapshot, val: number) => {
    setSnapshot((prev) => ({
      ...prev,
      [field]: val,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSavedSuccess(false)
    try {
      const res = await saveBalanceSnapshotAction({
        venueId: snapshot.venueId,
        monthKey: snapshot.monthKey,
        cashAmount: snapshot.cashAmount,
        inventoryFood: snapshot.inventoryFood,
        inventoryBar: snapshot.inventoryBar,
        accountsReceivable: snapshot.accountsReceivable,
        accountsPayable: snapshot.accountsPayable,
        payrollPayable: snapshot.payrollPayable,
        taxesPayable: snapshot.taxesPayable,
        guestPrepayments: snapshot.guestPrepayments,
        safetyReserveDays: snapshot.safetyReserveDays,
      })
      if (res.success && res.data) {
        setSnapshot(res.data)
        setSavedSuccess(true)
        onSnapshotSaved?.(res.data)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const { assets, liabilities, workingCapital, safeDividends } = reportData

  return (
    <div className="space-y-6">
      {/* Risk & Liquidity Radar (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* NWC Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Чистый оборотный капитал (NWC)
            </span>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(workingCapital.nwc)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Оборотные активы за вычетом срочных обязательств
            </p>
          </CardContent>
        </Card>

        {/* Current Ratio Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Текущая ликвидность (CR)
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {workingCapital.currentRatio > 100 ? '∞' : workingCapital.currentRatio.toFixed(2)}
              </span>
              <Badge
                className={
                  workingCapital.liquidityStatus === 'healthy'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : workingCapital.liquidityStatus === 'warning'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }
              >
                {workingCapital.liquidityLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Норма HoReCa: 0.8 – 1.2 (покрытие обязательств)
            </p>
          </CardContent>
        </Card>

        {/* Safe Dividends Card */}
        <Card className={safeDividends.isSafe ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-medium text-slate-700 uppercase tracking-wider">
              Лимит безопасных дивидендов
            </span>
            <Coins className={safeDividends.isSafe ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-rose-600'} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${safeDividends.isSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
              {safeDividends.isSafe ? formatCurrency(safeDividends.maxSafeDividend) : '0 ₽ (Запрещено)'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {safeDividends.isSafe
                ? `Резерв ${safeDividends.safetyReserveDays} дней (${formatCurrency(safeDividends.safetyBuffer)}) защищен`
                : `Дефицит ликвидности: ${formatCurrency(safeDividends.deficitAmount)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-Column Balance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ASSETS */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                Оборотные Активы
              </CardTitle>
              <span className="font-semibold text-blue-700">
                {formatCurrency(assets.totalCurrentAssets)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Деньги (Кассы, р/с, сейф)</Label>
                <p className="text-xs text-slate-500">Автоматическое сальдо из ДДС</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.cashAmount}
                onChange={(e) => handleFieldChange('cashAmount', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Склад: Кухня (Продукты)</Label>
                <p className="text-xs text-slate-500">По данным ревизии кухни</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.inventoryFood}
                onChange={(e) => handleFieldChange('inventoryFood', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Склад: Бар (Алкоголь)</Label>
                <p className="text-xs text-slate-500">По данным ревизии бара</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.inventoryBar}
                onChange={(e) => handleFieldChange('inventoryBar', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Дебиторка (Агрегаторы, банкеты)</Label>
                <p className="text-xs text-slate-500">Долги Яндекс Еды, b2b заказчиков</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.accountsReceivable}
                onChange={(e) => handleFieldChange('accountsReceivable', parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: LIABILITIES */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600" />
                Краткосрочные Обязательства
              </CardTitle>
              <span className="font-semibold text-rose-700">
                {formatCurrency(liabilities.totalCurrentLiabilities)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Долг поставщикам продуктов</Label>
                <p className="text-xs text-slate-500">Неоплаченные накладные с отсрочкой</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.accountsPayable}
                onChange={(e) => handleFieldChange('accountsPayable', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Задолженность по зарплате (ФОТ)</Label>
                <p className="text-xs text-slate-500">Начислено за отработанные смены</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.payrollPayable}
                onChange={(e) => handleFieldChange('payrollPayable', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Налоги и страховые взносы</Label>
                <p className="text-xs text-slate-500">УСН, НДФЛ, взносы к уплате</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.taxesPayable}
                onChange={(e) => handleFieldChange('taxesPayable', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Авансы гостей и сертификаты</Label>
                <p className="text-xs text-slate-500">Депозиты за предстоящие банкеты</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.guestPrepayments}
                onChange={(e) => handleFieldChange('guestPrepayments', parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Footer */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-slate-700 whitespace-nowrap">Подушка безопасности:</Label>
            <Select
              value={String(snapshot.safetyReserveDays || 10)}
              onValueChange={(val) => handleFieldChange('safetyReserveDays', parseInt(val, 10))}
            >
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Дней резерва" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней OPEX</SelectItem>
                <SelectItem value="10">10 дней OPEX</SelectItem>
                <SelectItem value="14">14 дней OPEX</SelectItem>
                <SelectItem value="21">21 день OPEX</SelectItem>
                <SelectItem value="30">30 дней OPEX</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-500">
              (буфер: {formatCurrency(safeDividends.safetyBuffer)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Снимок сохранён в БД
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Сохранение...' : 'Зафиксировать снимок баланса'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/app/reports/page.tsx` to include Balance Tab**

In `src/app/reports/page.tsx`:
1. Import `BalanceReport`, `exportBalanceToExcel`, `getBalanceSnapshotAction`, and `calculateBalanceReportData`.
2. Fetch `balanceSnapshot` when `selectedVenueId` or `monthKey` changes.
3. Add `<TabsTrigger value="balance">Баланс</TabsTrigger>` to `TabsList`.
4. Add `<TabsContent value="balance">` with `<BalanceReport>` and the download Excel button.

- [ ] **Step 3: Run typecheck and existing tests**

Run: `export PATH="$HOME/.local/node/bin:$PATH" && cd /Users/fatima/Desktop/Khamzat/finrest && npx tsc --noEmit && npm test`
Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit UI components**

```bash
cd /Users/fatima/Desktop/Khamzat/finrest
git add src/components/reports/BalanceReport.tsx src/app/reports/page.tsx
git commit -m "feat(ui): integrate management balance report tab and excel export in reports page"
```
