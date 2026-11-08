# Header Venue Dropdown & Mock Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove hardcoded template restaurants («Оливье», «Бистро», «Коктейль») from default state, replace the desktop horizontal button row in the header with a unified compact responsive dropdown showing the active venue, and handle empty states gracefully.

**Architecture:** 
1. In `src/context/AppContext.tsx`, initialize `venues` with `[]` and `selectedVenueId` with `''`, resolving real venues strictly from PostgreSQL.
2. In `src/components/layout/Header.tsx`, unify mobile popover and desktop buttons into a single responsive `VenueSelectorDropdown` with active checkmark and quick-link to `/venues`.
3. Provide explicit empty states when no venues exist (`+ Добавить заведение`) to avoid errors or blank fields.
4. Add unit and regression tests verifying initialization and selection lifecycle.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI Popover, Lucide icons, Node.js native test runner (`node:test`).

---

### Task 1: Clean mock venues from `AppContext.tsx` and ensure safe initialization

**Files:**
- Modify: `src/context/AppContext.tsx:120-185`
- Test: `tests/context/venues-init.test.ts`

- [ ] **Step 1: Write the failing unit test for venue initialization logic**

Create `tests/context/venues-init.test.ts`:
```typescript
import test from 'node:test'
import assert from 'node:assert/strict'

test('Venue Selection Logic: selects active venue if present in user venues', () => {
  const venues = [
    { id: 'v1', name: 'Кафе Уют' },
    { id: 'v2', name: 'Ресторан Восток' },
  ]
  const savedVenueId = 'v2'

  const activeId =
    savedVenueId && venues.some((v) => v.id === savedVenueId)
      ? savedVenueId
      : venues[0]?.id || ''

  assert.equal(activeId, 'v2')
})

test('Venue Selection Logic: falls back to first venue when saved ID is not found', () => {
  const venues = [
    { id: 'v1', name: 'Кафе Уют' },
    { id: 'v2', name: 'Ресторан Восток' },
  ]
  const savedVenueId = 'v-non-existent'

  const activeId =
    savedVenueId && venues.some((v) => v.id === savedVenueId)
      ? savedVenueId
      : venues[0]?.id || ''

  assert.equal(activeId, 'v1')
})

test('Venue Selection Logic: resolves to empty string when venues array is empty', () => {
  const venues: Array<{ id: string; name: string }> = []
  const savedVenueId = 'v1'

  const activeId =
    savedVenueId && venues.some((v) => v.id === savedVenueId)
      ? savedVenueId
      : venues[0]?.id || ''

  assert.equal(activeId, '')
})
```

- [ ] **Step 2: Run test to verify test execution**

Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npx tsx --test tests/context/venues-init.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/context/AppContext.tsx` to stop initializing with `mockVenues`**

Modify `src/context/AppContext.tsx`:
Change lines 123-127 from:
```typescript
  const [venues, setVenues] = useState<Venue[]>(mockVenues)
  const [selectedVenueId, setSelectedVenueId] = useLocalStorage<string>(
    'finrest_selected_venue',
    mockVenues[0]?.id || ''
  )
```
to:
```typescript
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useLocalStorage<string>(
    'finrest_selected_venue',
    ''
  )
```

In `loadInitialData()` (lines 167-176):
```typescript
        if (dbVenues && dbVenues.length > 0) {
          setVenues(dbVenues)

          const activeVenueId =
            selectedVenueId && dbVenues.some((v) => v.id === selectedVenueId)
              ? selectedVenueId
              : dbVenues[0].id

          setSelectedVenueId(activeVenueId)
...
        } else {
          setVenues([])
          setSelectedVenueId('')
        }
```

In `resetAllData()` (lines 530-535):
Instead of hardcoding `setVenues(mockVenues)`:
```typescript
    const freshVenues = await getVenuesAction()
    setVenues(freshVenues)
    setSelectedVenueId(freshVenues[0]?.id || '')
```

- [ ] **Step 4: Run typecheck and existing tests**

Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npx tsc --noEmit && npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/context/AppContext.tsx tests/context/venues-init.test.ts
git commit -m "feat(venues): remove mock venues default initialization and handle empty states safely"
```

---

### Task 2: Implement unified `VenueSelectorDropdown` in `Header.tsx`

**Files:**
- Modify: `src/components/layout/Header.tsx:1-240`
- Test: `tests/components/header-venue.test.ts`

- [ ] **Step 1: Write unit tests for Venue Dropdown representation logic**

Create `tests/components/header-venue.test.ts`:
```typescript
import test from 'node:test'
import assert from 'node:assert/strict'

interface VenueItem {
  id: string
  name: string
}

function getHeaderVenueState(venues: VenueItem[], selectedId: string) {
  if (venues.length === 0) {
    return {
      hasVenues: false,
      buttonText: 'Добавить заведение',
      currentVenue: null,
    }
  }

  const current = venues.find((v) => v.id === selectedId) || venues[0]
  return {
    hasVenues: true,
    buttonText: current.name,
    currentVenue: current,
  }
}

test('Header Venue: returns empty state action when no venues exist', () => {
  const state = getHeaderVenueState([], '')
  assert.equal(state.hasVenues, false)
  assert.equal(state.buttonText, 'Добавить заведение')
  assert.equal(state.currentVenue, null)
})

test('Header Venue: displays current venue name when selected', () => {
  const venues = [
    { id: '1', name: 'Steak House' },
    { id: '2', name: 'Sushi Bar' },
  ]
  const state = getHeaderVenueState(venues, '2')
  assert.equal(state.hasVenues, true)
  assert.equal(state.buttonText, 'Sushi Bar')
  assert.equal(state.currentVenue?.id, '2')
})

test('Header Venue: falls back to first venue when selectedId is empty', () => {
  const venues = [
    { id: '1', name: 'Steak House' },
    { id: '2', name: 'Sushi Bar' },
  ]
  const state = getHeaderVenueState(venues, '')
  assert.equal(state.hasVenues, true)
  assert.equal(state.buttonText, 'Steak House')
  assert.equal(state.currentVenue?.id, '1')
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npx tsx --test tests/components/header-venue.test.ts`
Expected: PASS

- [ ] **Step 3: Refactor `Header.tsx`**

1. Update imports in `src/components/layout/Header.tsx` to include `Check`, `ChevronDown`, `Plus`:
```typescript
import { Building2, Menu, Calendar, LogOut, User as UserIcon, Check, ChevronDown, Plus } from 'lucide-react'
```
2. Add state for venue dropdown popover:
```typescript
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false)
```
3. Replace the separate mobile venue popover (`<div className="sm:hidden">...</div>`) and desktop pills (`<div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-slate-50 p-1">...</div>`) with a single responsive venue selector:
```tsx
        {/* Unified Venue Selector Dropdown */}
        {venues.length > 0 ? (
          <Popover open={venueDropdownOpen} onOpenChange={setVenueDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium gap-1.5 max-w-[140px] sm:max-w-[220px] border-slate-200 hover:bg-slate-50 transition-colors"
                aria-label="Выбрать заведение"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{currentVenue?.name || 'Выберите заведение'}</span>
                <ChevronDown className="h-3 w-3 shrink-0 text-slate-400 opacity-70 ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-1.5 shadow-md border-slate-200" align="end">
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Заведения
                </div>
                {venues.map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => {
                      selectVenue(venue.id)
                      setVenueDropdownOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center justify-between ${
                      selectedVenueId === venue.id
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-2">{venue.name}</span>
                    {selectedVenueId === venue.id && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/venues"
                  onClick={() => setVenueDropdownOpen(false)}
                  className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-md font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Управление заведениями</span>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Link href="/venues">
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs font-medium gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              aria-label="Добавить заведение"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Добавить заведение</span>
              <span className="sm:hidden">Заведение</span>
            </Button>
          </Link>
        )}
```

- [ ] **Step 4: Run typecheck and test**

Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npx tsc --noEmit && npm test`
Expected: All pass.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/layout/Header.tsx tests/components/header-venue.test.ts
git commit -m "feat(ui): replace template restaurant pills with unified compact venue dropdown in header"
```

---

### Task 3: Verification, Edge-Case Auditing & GitHub Push

**Files:**
- Audit: `src/app/page.tsx`, `src/app/transactions/page.tsx`, `src/app/reports/page.tsx`
- Run: full test suite, linting, git status

- [ ] **Step 1: Run typecheck**
Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npx tsc --noEmit`
Expected: Clean output (exit code 0).

- [ ] **Step 2: Run linter**
Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npm run lint`
Expected: Clean output without lint errors.

- [ ] **Step 3: Run full test suite**
Run: `cd /Users/fatima/Desktop/Khamzat/finrest && npm test`
Expected: All 80+ tests pass cleanly.

- [ ] **Step 4: Push all commits to GitHub remote**
Run: `cd /Users/fatima/Desktop/Khamzat/finrest && git push origin master`
Expected: Remote `origin/master` up to date with `master`.
