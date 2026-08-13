import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatMessageReceived,
  FocusedChatThreadSchema,
  type IntegrationProvider,
} from '@streamkit/contracts'
import { and, desc, eq, lt, or, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import { chatMessageBuffer, integrationConnections } from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'

export const CHAT_BUFFER_MAX_MESSAGES = 10_000
export const CHAT_BUFFER_RETENTION_MS = 24 * 60 * 60 * 1_000
const FOCUSED_THREAD_MAX_MESSAGES = 200

export type FocusedChatKey = {
  channelId: string
  displayName: string
  provider: IntegrationProvider
  providerUserId: string
}

@Injectable()
export class FocusedChatRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async append(event: ChatMessageReceived): Promise<void> {
    const now = new Date().toISOString()
    await this.database.orm
      .insert(chatMessageBuffer)
      .values({
        avatarUrl: event.author.avatarUrl,
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
    await this.prune(new Date(now))
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
          avatarUrl: row?.avatarUrl ?? null,
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
}
