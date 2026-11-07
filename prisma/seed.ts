import { prisma } from '../src/lib/db/client'
import { mockVenues, mockTransactions } from '../src/data/mock'

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing records
  await prisma.deduplicationPair.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.venue.deleteMany()

  // Seed Venues
  for (const v of mockVenues) {
    await prisma.venue.create({
      data: {
        id: v.id,
        name: v.name,
        address: v.address,
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
