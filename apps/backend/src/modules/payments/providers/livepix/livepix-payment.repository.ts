import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../../../infrastructure/database/database.tokens'
import {
  paymentContributions,
  paymentProviderConnections,
} from '../../../../infrastructure/database/schema'
import { PaymentContributionSchema } from '@streamkit/contracts'
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

  public async listPending(limit = 100) {
    const rows = await this.database.orm
      .select()
      .from(paymentContributions)
      .where(inArray(paymentContributions.status, ['pending', 'manual_review']))
      .orderBy(paymentContributions.receivedAt)
      .limit(Math.max(1, Math.min(100, limit)))
    return rows.map((row) =>
      PaymentContributionSchema.parse({
        ...row,
        pendingReason: row.pendingReason,
      }),
    )
  }

  public async hasContribution(providerResourceId: string): Promise<boolean> {
    const [row] = await this.database.orm
      .select({ id: paymentContributions.id })
      .from(paymentContributions)
      .where(
        and(
          eq(paymentContributions.provider, 'livepix'),
          eq(paymentContributions.providerResourceId, providerResourceId),
        ),
      )
    return Boolean(row)
  }

  public async getContribution(id: string) {
    const [row] = await this.database.orm
      .select()
      .from(paymentContributions)
      .where(eq(paymentContributions.id, id))
    return row
      ? PaymentContributionSchema.parse({
          ...row,
          pendingReason: row.pendingReason,
        })
      : null
  }

  public async markProcessed(providerResourceId: string, campaignId: string | null = null) {
    await this.database.orm
      .update(paymentContributions)
      .set({
        campaignId,
        pendingReason: null,
        processedAt: new Date().toISOString(),
        status: 'processed',
      })
      .where(
        and(
          eq(paymentContributions.provider, 'livepix'),
          eq(paymentContributions.providerResourceId, providerResourceId),
        ),
      )
  }

  public async markManuallyResolved(id: string, campaignId: string) {
    await this.database.orm
      .update(paymentContributions)
      .set({
        campaignId,
        pendingReason: null,
        processedAt: new Date().toISOString(),
        status: 'processed',
      })
      .where(eq(paymentContributions.id, id))
  }
}
