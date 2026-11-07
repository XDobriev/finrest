'use server'

import { prisma } from '@/lib/db/client'
import { syncVenueIiko } from '@/lib/iiko/sync'
import { IikoClient } from '@/lib/iiko/client'
import type { IikoSyncResult, IikoOrganization } from '@/lib/iiko/types'

export async function syncVenueIikoAction(venueId: string): Promise<IikoSyncResult> {
  return syncVenueIiko(venueId)
}

export async function testIikoConnectionAction(apiKey: string): Promise<{
  success: boolean
  organizations: IikoOrganization[]
  error?: string
}> {
  try {
    const client = new IikoClient({ apiLogin: apiKey })
    await client.authenticate()
    const organizations = await client.getOrganizations()
    return {
      success: true,
      organizations,
    }
  } catch (err) {
    return {
      success: false,
      organizations: [],
      error: err instanceof Error ? err.message : 'Не удалось связаться с iikoCloud',
    }
  }
}

export async function saveIikoSettingsAction(
  venueId: string,
  settings: {
    apiKey: string
    orgId?: string
    autoSync: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.venue.update({
      where: { id: venueId },
      data: {
        iikoApiKey: settings.apiKey.trim(),
        iikoOrgId: settings.orgId || null,
        iikoAutoSync: settings.autoSync,
      },
    })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ошибка сохранения настроек iiko',
    }
  }
}
