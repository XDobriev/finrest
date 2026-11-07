import { prisma } from './client'
import type { Venue as PrismaVenue } from '@prisma/client'

export interface VenueSettings {
  dateToleranceDays: number
  amountTolerancePercent: number
  fuzzyMatchThreshold: number
}

export interface VenueWithSettings extends Omit<PrismaVenue, 'dateToleranceDays' | 'amountTolerancePercent' | 'fuzzyMatchThreshold'> {
  deduplicationSettings: VenueSettings
}

export async function getVenues(): Promise<VenueWithSettings[]> {
  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return venues.map(formatVenue)
}

export async function getVenueById(id: string): Promise<VenueWithSettings | null> {
  const venue = await prisma.venue.findUnique({
    where: { id },
  })

  return venue ? formatVenue(venue) : null
}

export async function createVenue(data: {
  id?: string
  name: string
  address?: string
  dateToleranceDays?: number
  amountTolerancePercent?: number
  fuzzyMatchThreshold?: number
}): Promise<VenueWithSettings> {
  const venue = await prisma.venue.create({
    data: {
      ...(data.id ? { id: data.id } : {}),
      name: data.name,
      address: data.address,
      dateToleranceDays: data.dateToleranceDays ?? 1,
      amountTolerancePercent: data.amountTolerancePercent ?? 5.0,
      fuzzyMatchThreshold: data.fuzzyMatchThreshold ?? 0.7,
    },
  })

  return formatVenue(venue)
}

export async function updateVenue(
  id: string,
  data: Partial<{
    name: string
    address?: string
    dateToleranceDays?: number
    amountTolerancePercent?: number
    fuzzyMatchThreshold?: number
  }>
): Promise<VenueWithSettings> {
  const venue = await prisma.venue.update({
    where: { id },
    data,
  })

  return formatVenue(venue)
}

export async function deleteVenue(id: string): Promise<void> {
  await prisma.venue.delete({
    where: { id },
  })
}

function formatVenue(venue: PrismaVenue): VenueWithSettings {
  const { dateToleranceDays, amountTolerancePercent, fuzzyMatchThreshold, ...rest } = venue
  return {
    ...rest,
    deduplicationSettings: {
      dateToleranceDays,
      amountTolerancePercent,
      fuzzyMatchThreshold,
    },
  }
}
