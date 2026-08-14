import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatMessageReceived,
  FocusedChatThreadSchema,
  type IntegrationConnectionStatus,
  type IntegrationProvider,
} from '@streamkit/contracts'
import { and, desc, eq, isNotNull, lt, or, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import { chatMessageBuffer, integrationConnections } from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'

export const CHAT_BUFFER_MAX_MESSAGES = 10_000
export const CHAT_BUFFER_RETENTION_MS = 24 * 60 * 60 * 1_000
const CHAT_PRUNE_INTERVAL_MS = 5_000
const CHAT_PRUNE_EVERY_MESSAGES = 250
const FOCUSED_THREAD_MAX_MESSAGES = 200

export type FocusedChatKey = {
  channelId: string
  displayName: string
  provider: IntegrationProvider
  providerUserId: string
}

@Injectable()
export class FocusedChatRepository {
  private lastPrunedAt = 0
  private writesSincePrune = 0
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async append(event: ChatMessageReceived): Promise<void> {
    const now = new Date().toISOString()
    const [latestAvatar] = event.author.avatarUrl
      ? await this.database.orm
          .select({ avatarUrl: chatMessageBuffer.avatarUrl })
          .from(chatMessageBuffer)
          .where(
            and(
              eq(chatMessageBuffer.provider, event.provider),
              eq(chatMessageBuffer.channelId, event.channelId),
              eq(chatMessageBuffer.providerUserId, event.author.providerUserId),
              isNotNull(chatMessageBuffer.avatarUrl),
            ),
          )
          .orderBy(desc(chatMessageBuffer.occurredAt))
          .limit(1)
      : []
    await this.database.orm
      .insert(chatMessageBuffer)
      .values({
        avatarUrl:
          latestAvatar?.avatarUrl === event.author.avatarUrl ? null : event.author.avatarUrl,
        badgesJson: JSON.stringify(event.badges),
        channelId: event.channelId,
        displayName: event.author.displayName,
        externalEventId: event.externalEventId,
        handle: event.author.handle,
        id: randomUUID(),
        message: event.message,
        occurredAt: event.occurredAt,
        provider: event.provider,
        providerUserId: event.author.providerUserId,
        receivedAt: now,
      })
      .onConflictDoNothing()
    this.writesSincePrune += 1
    if (
      this.writesSincePrune >= CHAT_PRUNE_EVERY_MESSAGES ||
      Date.now() - this.lastPrunedAt >= CHAT_PRUNE_INTERVAL_MS
    ) {
      await this.prune(new Date(now))
      this.writesSincePrune = 0
      this.lastPrunedAt = Date.now()
    }
  }

  public async prune(now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - CHAT_BUFFER_RETENTION_MS).toISOString()
    await this.database.orm
      .delete(chatMessageBuffer)
      .where(lt(chatMessageBuffer.receivedAt, cutoff))
    await this.database.orm.run(sql`
      DELETE FROM chat_message_buffer
      WHERE id IN (
        SELECT id FROM chat_message_buffer
        ORDER BY received_at DESC
        LIMIT -1 OFFSET ${CHAT_BUFFER_MAX_MESSAGES}
      )
    `)
  }

  public async thread(subject: string, keys: readonly FocusedChatKey[]) {
    if (!keys.length)
      return FocusedChatThreadSchema.parse({
        connections: [],
        identities: [],
        messages: [],
        subject,
      })
    const identityFilter = or(
      ...keys.map((key) =>
        and(
          eq(chatMessageBuffer.provider, key.provider),
          eq(chatMessageBuffer.channelId, key.channelId),
          eq(chatMessageBuffer.providerUserId, key.providerUserId),
        ),
      ),
    )
    const rows = await this.database.orm
      .select()
      .from(chatMessageBuffer)
      .where(identityFilter)
      .orderBy(desc(chatMessageBuffer.occurredAt))
      .limit(FOCUSED_THREAD_MAX_MESSAGES)
    const connectionRows = await this.database.orm
      .select()
      .from(integrationConnections)
      .where(
        or(
          ...keys.map((key) =>
            and(
              eq(integrationConnections.provider, key.provider),
              eq(integrationConnections.channelId, key.channelId),
            ),
          ),
        ),
      )
    const avatarRows = await Promise.all(
      keys.map(async (key) => {
        const [row] = await this.database.orm
          .select({ avatarUrl: chatMessageBuffer.avatarUrl })
          .from(chatMessageBuffer)
          .where(
            and(
              eq(chatMessageBuffer.provider, key.provider),
              eq(chatMessageBuffer.channelId, key.channelId),
              eq(chatMessageBuffer.providerUserId, key.providerUserId),
              isNotNull(chatMessageBuffer.avatarUrl),
            ),
          )
          .orderBy(desc(chatMessageBuffer.occurredAt))
          .limit(1)
        return [
          `${key.provider}:${key.channelId}:${key.providerUserId}`,
          row?.avatarUrl ?? null,
        ] as const
      }),
    )
    const avatars = new Map(avatarRows)
    const connections = connectionRows.map((row) => ({
      ...row,
      capabilities: JSON.parse(row.capabilitiesJson) as unknown,
    }))
    const latest = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = `${row.provider}:${row.channelId}:${row.providerUserId}`
      if (!latest.has(key)) latest.set(key, row)
    }
    return FocusedChatThreadSchema.parse({
      connections,
      identities: keys.map((key) => {
        const row = latest.get(`${key.provider}:${key.channelId}:${key.providerUserId}`)
        return {
          avatarUrl: avatars.get(`${key.provider}:${key.channelId}:${key.providerUserId}`) ?? null,
          channelId: key.channelId,
          displayName: row?.displayName ?? key.displayName,
          handle: row?.handle ?? key.displayName,
          provider: key.provider,
          providerUserId: key.providerUserId,
        }
      }),
      messages: rows.reverse().map((row) => ({
        avatarUrl: row.avatarUrl,
        badges: JSON.parse(row.badgesJson) as unknown,
        channelId: row.channelId,
        connectionId:
          connectionRows.find(
            (connection) =>
              connection.provider === row.provider && connection.channelId === row.channelId,
          )?.id ?? null,
        displayName: row.displayName,
        handle: row.handle,
        id: row.id,
        message: row.message,
        occurredAt: row.occurredAt,
        provider: row.provider,
        providerUserId: row.providerUserId,
      })),
      subject,
    })
  }

  public async count(): Promise<number> {
    return this.database.orm.$count(chatMessageBuffer)
  }

  public async forChannel(connection: {
    id: string
    provider: IntegrationProvider
    channelId: string
    channelDisplayName: string
    capabilities: unknown[]
    createdAt: string
    lastErrorCode: string | null
    nextRetryAt: string | null
    retryAttempt: number
    status: IntegrationConnectionStatus
    updatedAt: string
  }) {
    const rows = await this.database.orm
      .select()
      .from(chatMessageBuffer)
      .where(
        and(
          eq(chatMessageBuffer.provider, connection.provider),
          eq(chatMessageBuffer.channelId, connection.channelId),
        ),
      )
      .orderBy(desc(chatMessageBuffer.occurredAt))
      .limit(200)
    const identities = new Map<string, (typeof rows)[number]>()
    for (const row of rows) identities.set(row.providerUserId, row)
    return FocusedChatThreadSchema.parse({
      connections: [connection],
      identities: [...identities.values()].map((row) => ({
        avatarUrl: row.avatarUrl,
        channelId: row.channelId,
        displayName: row.displayName,
        handle: row.handle,
        provider: row.provider,
        providerUserId: row.providerUserId,
      })),
      messages: rows.reverse().map((row) => ({
        avatarUrl: row.avatarUrl,
        badges: JSON.parse(row.badgesJson) as string[],
        channelId: row.channelId,
        connectionId: connection.id,
        displayName: row.displayName,
        handle: row.handle,
        id: row.id,
        message: row.message,
        occurredAt: row.occurredAt,
        provider: row.provider,
        providerUserId: row.providerUserId,
      })),
      subject: connection.channelDisplayName,
    })
  }
}
