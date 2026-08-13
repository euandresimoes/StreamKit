import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatMessageReceived,
  ChatMessageReceivedSchema,
  IntegrationCapabilitySchema,
  IntegrationConnectionSchema,
  type IntegrationConnectionStatus,
  type SaveIntegrationConnectionRequest,
} from '@streamkit/contracts'
import { and, eq } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  integrationConnections,
  integrationEvents,
  integrationOffsets,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'

type ConnectionStateUpdate = {
  lastErrorCode: string | null
  nextRetryAt: string | null
  retryAttempt: number
  status: IntegrationConnectionStatus
}

@Injectable()
export class IntegrationRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async deleteConnection(id: string): Promise<void> {
    await this.database.orm.delete(integrationConnections).where(eq(integrationConnections.id, id))
  }

  public async getConnection(id: string) {
    const [row] = await this.database.orm
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, id))
    return row ? this.parseConnection(row) : null
  }

  public async listConnections() {
    const rows = await this.database.orm.select().from(integrationConnections)
    return rows.map((row) => this.parseConnection(row))
  }

  public async updateProviderState(
    provider: 'kick' | 'twitch' | 'youtube',
    status: IntegrationConnectionStatus,
    lastErrorCode: string | null,
  ): Promise<void> {
    await this.database.orm
      .update(integrationConnections)
      .set({
        lastErrorCode: normalizeIntegrationErrorCode(lastErrorCode),
        status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(integrationConnections.provider, provider))
  }

  public async getOffset(connectionId: string): Promise<string | null> {
    const [row] = await this.database.orm
      .select()
      .from(integrationOffsets)
      .where(eq(integrationOffsets.connectionId, connectionId))
    return row?.cursor ?? null
  }

  public async saveConnection(input: SaveIntegrationConnectionRequest) {
    const now = new Date().toISOString()
    await this.database.orm
      .insert(integrationConnections)
      .values({
        capabilitiesJson: JSON.stringify(input.capabilities),
        channelDisplayName: input.channelDisplayName,
        channelId: input.channelId,
        createdAt: now,
        id: randomUUID(),
        lastErrorCode: null,
        nextRetryAt: null,
        provider: input.provider,
        retryAttempt: 0,
        status: 'disconnected',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [integrationConnections.provider, integrationConnections.channelId],
        set: {
          capabilitiesJson: JSON.stringify(input.capabilities),
          channelDisplayName: input.channelDisplayName,
          updatedAt: now,
        },
      })
    const [row] = await this.database.orm
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.provider, input.provider),
          eq(integrationConnections.channelId, input.channelId),
        ),
      )
    return this.parseConnection(row!)
  }

  public async saveEvent(event: ChatMessageReceived): Promise<boolean> {
    const parsed = ChatMessageReceivedSchema.parse(event)
    const inserted = await this.database.orm
      .insert(integrationEvents)
      .values({
        channelId: parsed.channelId,
        eventType: parsed.type,
        externalEventId: parsed.externalEventId,
        id: randomUUID(),
        occurredAt: parsed.occurredAt,
        payloadJson: JSON.stringify(parsed),
        processedAt: null,
        provider: parsed.provider,
        providerUserId: parsed.author.providerUserId,
        receivedAt: new Date().toISOString(),
        status: 'received',
      })
      .onConflictDoNothing()
      .returning({ id: integrationEvents.id })
    return inserted.length === 1
  }

  public async markEventProcessed(
    provider: ChatMessageReceived['provider'],
    externalEventId: string,
    status: 'handler_failed' | 'processed',
  ): Promise<void> {
    await this.database.orm
      .update(integrationEvents)
      .set({ processedAt: new Date().toISOString(), status })
      .where(
        and(
          eq(integrationEvents.provider, provider),
          eq(integrationEvents.externalEventId, externalEventId),
        ),
      )
  }

  public async saveOffset(connectionId: string, cursor: string): Promise<void> {
    const updatedAt = new Date().toISOString()
    await this.database.orm
      .insert(integrationOffsets)
      .values({ connectionId, cursor, updatedAt })
      .onConflictDoUpdate({
        target: integrationOffsets.connectionId,
        set: { cursor, updatedAt },
      })
  }

  public async updateConnectionState(id: string, update: ConnectionStateUpdate) {
    await this.database.orm
      .update(integrationConnections)
      .set({
        ...update,
        lastErrorCode: normalizeIntegrationErrorCode(update.lastErrorCode),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(integrationConnections.id, id))
    return this.getConnection(id)
  }

  private parseConnection(row: typeof integrationConnections.$inferSelect) {
    return IntegrationConnectionSchema.parse({
      ...row,
      capabilities: IntegrationCapabilitySchema.array().parse(JSON.parse(row.capabilitiesJson)),
      lastErrorCode: normalizeIntegrationErrorCode(row.lastErrorCode),
    })
  }
}

export function normalizeIntegrationErrorCode(value: string | null): string | null {
  if (value === null) return null
  return /^[A-Z][A-Z0-9_]{0,99}$/.test(value) ? value : 'INTEGRATION_CONNECTION_FAILED'
}
