import { prisma } from '../src/lib/db/client'
import { mockVenues, mockTransactions } from '../src/data/mock'
import { hashPassword } from '../src/lib/auth/password'

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing records
  await prisma.deduplicationPair.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.cashBalance.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.fileUpload.deleteMany()
  await prisma.venue.deleteMany()
  await prisma.user.deleteMany()

  // Seed Users
  const passwordHash = await hashPassword('finrest2026')

  const owner = await prisma.user.create({
    data: {
      email: 'admin@finrest.ru',
      passwordHash,
      name: 'Константин Ивлев',
      role: 'OWNER',
    },
  })

  await prisma.user.create({
    data: {
      email: 'manager@finrest.ru',
      passwordHash,
      name: 'Мария Управляющая',
      role: 'MANAGER',
    },
  })

  await prisma.user.create({
    data: {
      email: 'accountant@finrest.ru',
      passwordHash,
      name: 'Елена Главбух',
      role: 'ACCOUNTANT',
    },
  })

  console.log('✅ Seeded 3 demo users (password: finrest2026)')

  // Seed Venues
  for (const v of mockVenues) {
    await prisma.venue.create({
      data: {
        id: v.id,
        name: v.name,
        address: v.address,
        ownerId: owner.id,
        dateToleranceDays: v.deduplicationSettings.dateToleranceDays,
        amountTolerancePercent: v.deduplicationSettings.amountTolerancePercent,
        fuzzyMatchThreshold: v.deduplicationSettings.fuzzyMatchThreshold,
        createdAt: new Date(v.createdAt),
      },
    })
  }
  console.log(`✅ Seeded ${mockVenues.length} venues`)

  // Seed Transactions
  for (const tx of mockTransactions) {
    await prisma.transaction.create({
      data: {
        id: tx.id,
        venueId: tx.venueId,
        source: tx.source,
        date: new Date(tx.date),
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        counterparty: tx.counterparty,
        description: tx.description,
        status: tx.status,
        duplicateOfId: tx.duplicateOfId,
        createdAt: new Date(tx.createdAt),
      },
    })
  }
  console.log(`✅ Seeded ${mockTransactions.length} transactions`)

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
