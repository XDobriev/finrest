import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export function normalizeConnectionString(url: string): string {
  if (url.includes('sslmode=require')) {
    return url.replace('sslmode=require', 'sslmode=verify-full')
  }
  return url
}

const rawConnectionString =
  process.env.DATABASE_URL || 'postgresql://fatima@localhost:5432/finrest_dev?schema=public'

const connectionString = normalizeConnectionString(rawConnectionString)

const adapter = new PrismaPg({ connectionString })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

