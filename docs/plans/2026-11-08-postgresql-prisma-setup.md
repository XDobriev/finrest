# PostgreSQL and Prisma Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish local development environment (Node.js LTS, PostgreSQL), initialize Prisma ORM in `finrest`, define relational models matching restaurant domain requirements, execute initial migration, seed database, and wire up database repository layer with automated tests.

**Architecture:** Next.js 16 App Router using Prisma Client as the ORM connected to local PostgreSQL. Business queries encapsulated in a dedicated server repository layer (`src/lib/db/`), ensuring type-safety and isolation per venue (multi-tenancy).

**Tech Stack:** Node.js v22 LTS (darwin-arm64), PostgreSQL 17, Prisma ORM (`prisma`, `@prisma/client`), Next.js 16, TypeScript 5.

---

## Proposed File Structure

```text
finrest/
├── prisma/
│   ├── schema.prisma          # Prisma schema with relational models
│   ├── migrations/            # Auto-generated SQL migrations
│   └── seed.ts                # Database seeding script from mock data
├── src/
│   ├── lib/
│   │   └── db/
│   │       ├── client.ts      # Global PrismaClient singleton
│   │       ├── venues.ts      # Venue repository functions
│   │       └── transactions.ts# Transaction repository functions
│   └── types/
│       └── index.ts           # Types synchronized with Prisma models
├── tests/
│   └── db/
│       └── repositories.test.ts # TDD integration tests for database operations
└── .env                       # Local environment variables (DATABASE_URL)
```

---

## Tasks

- [ ] **Task 1: Environment Runtime Setup (Node.js & PostgreSQL)**
  - [ ] Download and unpack official Node.js v22 LTS (`darwin-arm64`) to `~/.local/node`.
  - [ ] Configure `~/.zshrc` and session PATH to include `$HOME/.local/node/bin`.
  - [ ] Verify `node -v` (>= 20) and `npm -v`.
  - [ ] Download and configure Postgres.app / local PostgreSQL binary, start PostgreSQL server on port 5432.
  - [ ] Create `finrest_dev` database using `createdb finrest_dev` or `psql`.
  - [ ] Verification command: `node -v && psql -U $USER -d finrest_dev -c "SELECT 1;"`

- [ ] **Task 2: Project Dependencies & Prisma Initialization**
  - [ ] Run `npm install` inside `finrest/` to install existing Next.js dependencies.
  - [ ] Install Prisma dependencies: `npm install -D prisma` and `npm install @prisma/client`.
  - [ ] Initialize Prisma: `npx prisma init --datasource-provider postgresql`.
  - [ ] Configure `.env` with `DATABASE_URL="postgresql://localhost:5432/finrest_dev"`.
  - [ ] Verification command: `npx prisma --version`

- [ ] **Task 3: Schema Definition & Migration**
  - [ ] Write `prisma/schema.prisma` with models:
    - `User` (id, email, passwordHash, role, createdAt)
    - `Venue` (id, name, address, settings, createdAt)
    - `Transaction` (id, venueId, source, date, amount, type, category, counterparty, description, status)
    - `DeduplicationPair` (id, venueId, leftTxId, rightTxId, matchScore, status)
    - `FileUpload` (id, venueId, source, fileName, fileSize, rowCount, status)
  - [ ] Run `npx prisma migrate dev --name init` to create tables.
  - [ ] Generate Prisma Client: `npx prisma generate`.
  - [ ] Verification command: `npx prisma migrate status`

- [ ] **Task 4: Database Seeding & Integration Test (TDD)**
  - [ ] Create failing test in `tests/db/repositories.test.ts` checking venue retrieval.
  - [ ] Run test and verify it fails (Red).
  - [ ] Implement `prisma/seed.ts` porting `src/data/mock/index.ts` data into PostgreSQL.
  - [ ] Execute `npx prisma db seed`.
  - [ ] Implement `src/lib/db/client.ts` (Prisma singleton) and `src/lib/db/venues.ts`.
  - [ ] Re-run test and verify it passes (Green).
  - [ ] Verification command: `npx tsx tests/db/repositories.test.ts`

- [ ] **Task 5: Server Actions & Repository Layer**
  - [ ] Implement `src/lib/db/transactions.ts` with pagination, date filtering, and status updates.
  - [ ] Write unit tests for transaction queries.
  - [ ] Run typecheck: `npx tsc --noEmit`.
  - [ ] Verification command: `npx tsc --noEmit`

- [ ] **Task 6: Final Verification & Review Checkpoint**
  - [ ] Run linter: `npm run lint`.
  - [ ] Check Git status: `git status`.
  - [ ] Present checkpoint summary to user.
