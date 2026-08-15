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

export const CHAT_BUFFER_MAX_MESSAGES = 100
export const CHAT_BUFFER_RETENTION_MS = 24 * 60 * 60 * 1_000
const CHAT_PRUNE_INTERVAL_MS = 5_000
const CHAT_PRUNE_EVERY_MESSAGES = 25
const FOCUSED_THREAD_MAX_MESSAGES = 100

export type FocusedChatKey = {
  channelId: string
  displayName: string
  identityKey?: string
  provider: IntegrationProvider
  providerUserId: string | null
  liveSessionKey?: string | null
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
              event.liveSessionKey
                ? eq(chatMessageBuffer.liveSessionKey, event.liveSessionKey)
                : undefined,
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
        liveSessionKey: event.liveSessionKey,
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
    const identityFilter = or(
      ...keys.map((key) =>
        (() => {
          const sessionKey =
            key.liveSessionKey ??
            connectionRows.find(
              (connection) =>
                connection.provider === key.provider && connection.channelId === key.channelId,
            )?.liveSessionKey
          return and(
            eq(chatMessageBuffer.provider, key.provider),
            eq(chatMessageBuffer.channelId, key.channelId),
            sessionKey ? eq(chatMessageBuffer.liveSessionKey, sessionKey) : undefined,
            key.providerUserId
              ? eq(chatMessageBuffer.providerUserId, key.providerUserId)
              : sql`lower(${chatMessageBuffer.handle}) = lower(${key.identityKey ?? key.displayName})`,
          )
        })(),
      ),
    )
    const rows = await this.database.orm
      .select()
      .from(chatMessageBuffer)
      .where(identityFilter)
      .orderBy(desc(chatMessageBuffer.occurredAt))
      .limit(FOCUSED_THREAD_MAX_MESSAGES)
    const avatarRows = await Promise.all(
      keys.map(async (key) => {
        const sessionKey =
          key.liveSessionKey ??
          connectionRows.find(
            (connection) =>
              connection.provider === key.provider && connection.channelId === key.channelId,
          )?.liveSessionKey
        const [row] = await this.database.orm
          .select({ avatarUrl: chatMessageBuffer.avatarUrl })
          .from(chatMessageBuffer)
          .where(
            and(
              eq(chatMessageBuffer.provider, key.provider),
              eq(chatMessageBuffer.channelId, key.channelId),
              sessionKey ? eq(chatMessageBuffer.liveSessionKey, sessionKey) : undefined,
              key.providerUserId
                ? eq(chatMessageBuffer.providerUserId, key.providerUserId)
                : sql`lower(${chatMessageBuffer.handle}) = lower(${key.identityKey ?? key.displayName})`,
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
    const avatars = new Map<string, string | null>(avatarRows)
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
        const row =
          latest.get(`${key.provider}:${key.channelId}:${key.providerUserId}`) ??
          rows.find(
            (candidate) =>
              candidate.provider === key.provider &&
              candidate.channelId === key.channelId &&
              candidate.handle.toLocaleLowerCase() ===
                (key.identityKey ?? key.displayName).toLocaleLowerCase(),
          )
        return {
          avatarUrl: avatars.get(`${key.provider}:${key.channelId}:${key.providerUserId}`) ?? null,
          channelId: key.channelId,
          displayName: row?.displayName ?? key.displayName,
          handle: row?.handle ?? key.displayName,
          provider: key.provider,
          providerUserId:
            row?.providerUserId ?? key.providerUserId ?? key.identityKey ?? key.displayName,
        }
      }),
      messages: rows.reverse().map((row) => ({
        avatarUrl:
          avatars.get(`${row.provider}:${row.channelId}:${row.providerUserId}`) ?? row.avatarUrl,
        badges: JSON.parse(row.badgesJson) as unknown,
        channelId: row.channelId,
        connectionId:
          connectionRows.find(
            (connection) =>
              connection.provider === row.provider && connection.channelId === row.channelId,
          )?.id ?? null,
        displayName: row.displayName,
        externalEventId: row.externalEventId,
        handle: row.handle,
        id: row.id,
        message: row.message,
        liveSessionKey: row.liveSessionKey,
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
    liveSessionKey: string | null
    updatedAt: string
  }) {
    const rows = await this.database.orm
      .select()
      .from(chatMessageBuffer)
      .where(
        and(
          eq(chatMessageBuffer.provider, connection.provider),
          eq(chatMessageBuffer.channelId, connection.channelId),
          connection.liveSessionKey
            ? eq(chatMessageBuffer.liveSessionKey, connection.liveSessionKey)
            : undefined,
        ),
      )
      .orderBy(desc(chatMessageBuffer.occurredAt))
      .limit(FOCUSED_THREAD_MAX_MESSAGES)
    const identities = new Map<string, (typeof rows)[number]>()
    for (const row of rows) identities.set(row.providerUserId, row)
    const avatars = new Map<string, string>()
    for (const row of rows) {
      if (row.avatarUrl && !avatars.has(row.providerUserId))
        avatars.set(row.providerUserId, row.avatarUrl)
    }
    return FocusedChatThreadSchema.parse({
      connections: [connection],
      identities: [...identities.values()].map((row) => ({
        avatarUrl: avatars.get(row.providerUserId) ?? row.avatarUrl,
        channelId: row.channelId,
        displayName: row.displayName,
        handle: row.handle,
        provider: row.provider,
        providerUserId: row.providerUserId,
      })),
      messages: rows.reverse().map((row) => ({
        avatarUrl: avatars.get(row.providerUserId) ?? row.avatarUrl,
        badges: JSON.parse(row.badgesJson) as string[],
        channelId: row.channelId,
        connectionId: connection.id,
        displayName: row.displayName,
        externalEventId: row.externalEventId,
        handle: row.handle,
        id: row.id,
        message: row.message,
        liveSessionKey: row.liveSessionKey,
        occurredAt: row.occurredAt,
        provider: row.provider,
        providerUserId: row.providerUserId,
      })),
      subject: connection.channelDisplayName,
    })
  }
}
