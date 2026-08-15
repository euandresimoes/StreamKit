import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../../../infrastructure/database/database.tokens'
import {
  paymentContributions,
  paymentProviderConnections,
} from '../../../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../../../infrastructure/database/sqlite-database'

@Injectable()
export class LivePixPaymentRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async connection() {
    const [row] = await this.database.orm
      .select()
      .from(paymentProviderConnections)
      .where(eq(paymentProviderConnections.provider, 'livepix'))
    return row ?? null
  }

  public async saveConnection(input: {
    accountId?: string | null
    accountUsername: string | null
    generation: number
    lastErrorCode: string | null
    remoteWebhookId: string | null
    state: string
    webhookUrl: string | null
  }): Promise<void> {
    const now = new Date().toISOString()
    await this.database.orm
      .insert(paymentProviderConnections)
      .values({ provider: 'livepix', createdAt: now, updatedAt: now, ...input })
      .onConflictDoUpdate({
        target: paymentProviderConnections.provider,
        set: { ...input, updatedAt: now },
      })
  }

  public async saveContribution(input: {
    amountInCents: number
    contributionType: 'payment'
    currency: string
    eventId: string
    message: string | null
    occurredAt: string
    participantHandle: string | null
    participantPlatform: 'kick' | 'twitch' | 'youtube' | null
    pendingReason: string | null
    providerReference: string | null
    providerResourceId: string
  }): Promise<boolean> {
    const inserted = await this.database.orm
      .insert(paymentContributions)
      .values({
        id: randomUUID(),
        provider: 'livepix',
        receivedAt: new Date().toISOString(),
        status: 'pending',
        processedAt: null,
        campaignId: null,
        ...input,
      })
      .onConflictDoNothing()
      .returning({ id: paymentContributions.id })
    return inserted.length === 1
  }
}
