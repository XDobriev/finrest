# UI to PostgreSQL Database Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Next.js frontend UI to PostgreSQL via Next.js Server Actions, replacing `localStorage` mock data in `AppContext` and enabling real persistent CRUD for venues, transactions, and deduplication pairs.

**Architecture:** Next.js 16 Server Actions (`src/app/actions/`) acting as the type-safe RPC boundary between React client components and Prisma database repositories (`src/lib/db/`). `AppContext` manages client-side caching, active venue selection, and optimistic updates.

**Tech Stack:** Next.js 16 (Server Actions), React 19, Prisma ORM, PostgreSQL 17, TypeScript 5.

---

## File Structure

```text
finrest/
├── src/
│   ├── app/
│   │   └── actions/
│   │       ├── venues.ts         # 'use server' actions for venues
│   │       ├── transactions.ts   # 'use server' actions for transactions
│   │       └── deduplication.ts  # 'use server' actions for deduplication
│   ├── context/
│   │   └── AppContext.tsx        # Updated AppContext communicating with Server Actions
│   └── lib/
│       └── db/
│           ├── venues.ts         # Existing Prisma queries
│           └── transactions.ts   # Existing Prisma queries
└── tests/
    └── actions/
        └── actions.test.ts       # Integration tests for server actions
```

---

## Tasks

- [ ] **Task 1: Server Actions Layer (`src/app/actions/`)**
  - [ ] Create `src/app/actions/venues.ts` with `'use server'` exports:
    - `getVenuesAction()`
    - `createVenueAction(name, address)`
    - `updateVenueAction(id, data)`
    - `deleteVenueAction(id)`
  - [ ] Create `src/app/actions/transactions.ts` with `'use server'` exports:
    - `getTransactionsAction(venueId, filter)`
    - `createTransactionAction(data)`
    - `updateTransactionStatusAction(id, status, duplicateOfId)`
  - [ ] Create `src/app/actions/deduplication.ts` with `'use server'` exports:
    - `getDeduplicationPairsAction(venueId)`
    - `resolveDeduplicationPairAction(id, action)`
  - [ ] Verification command: `npx tsc --noEmit`

- [ ] **Task 2: TDD Integration Tests for Server Actions**
  - [ ] Create failing test in `tests/actions/actions.test.ts`.
  - [ ] Test fetching venues, creating a transaction, and resolving a duplicate pair.
  - [ ] Run test to verify it passes (Green).
  - [ ] Verification command: `npx tsx --test tests/actions/actions.test.ts`

- [ ] **Task 3: Modernize `AppContext.tsx` with Database Integration**
  - [ ] Replace `useLocalStorage` for domain entities (`venues`, `transactions`, `deduplicationPairs`) with asynchronous fetching via Server Actions.
  - [ ] Retain `selectedVenueId` in `localStorage` so user's active venue selection persists across reloads.
  - [ ] Add `isLoading` and `error` state to `AppContext`.
  - [ ] Update action handlers (`addVenue`, `addTransaction`, `resolveDeduplicationPair`) to call Server Actions and update local state.
  - [ ] Verification command: `npx tsc --noEmit`

- [ ] **Task 4: Quality & End-to-End Verification**
  - [ ] Run all test suites: `npx tsx --test tests/db/repositories.test.ts tests/actions/actions.test.ts`.
  - [ ] Run linter: `npm run lint`.
  - [ ] Run typecheck: `npx tsc --noEmit`.
  - [ ] Check Git status: `git status`.
  - [ ] Commit changes with clean commit message.
