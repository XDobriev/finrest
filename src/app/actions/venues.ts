'use server'

import {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
} from '@/lib/db/venues'
import type { Venue } from '@/types'

export async function getVenuesAction(): Promise<Venue[]> {
  const venues = await getVenues()
  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }))
}

export async function getVenueByIdAction(id: string): Promise<Venue | null> {
  const v = await getVenueById(id)
  if (!v) return null

  return {
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }
}

export async function createVenueAction(
  name: string,
  address?: string
): Promise<Venue> {
  const v = await createVenue({ name, address })
  return {
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }
}

export async function updateVenueAction(
  id: string,
  data: Partial<{
    name: string
    address?: string
    dateToleranceDays?: number
    amountTolerancePercent?: number
    fuzzyMatchThreshold?: number
  }>
): Promise<Venue> {
  const v = await updateVenue(id, data)
  return {
    id: v.id,
    name: v.name,
    address: v.address ?? undefined,
    createdAt: v.createdAt.toISOString(),
    deduplicationSettings: v.deduplicationSettings,
  }
}

export async function deleteVenueAction(id: string): Promise<{ success: boolean }> {
  await deleteVenue(id)
  return { success: true }
}
