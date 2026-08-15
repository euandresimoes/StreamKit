import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ExternalEventIngress,
  ExternalEventProviderSchema,
  type ExternalEventRecord,
  ExternalEventRecordSchema,
} from '@streamkit/contracts'
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../../infrastructure/database/database.tokens'
import { externalEventQueue } from '../../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../../infrastructure/database/sqlite-database'

const EXTERNAL_EVENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000
const MAX_ATTEMPTS = 8

export type ExternalEventQueueInput = ExternalEventIngress & {
  provider: string
}

@Injectable()
export class ExternalEventQueueRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async enqueue(input: ExternalEventQueueInput): Promise<ExternalEventRecord | null> {
    const provider = ExternalEventProviderSchema.parse(input.provider)
    const receivedAt = new Date().toISOString()
    const inserted = await this.database.orm
      .insert(externalEventQueue)
      .values({
        attemptCount: 0,
        eventId: input.eventId,
        eventType: input.eventType,
        id: randomUUID(),
        lastErrorCode: null,
        nextAttemptAt: null,
        payloadJson: JSON.stringify(input.payload),
        processedAt: null,
        provider,
        receivedAt,
        status: 'received',
        timestamp: input.timestamp,
      })
      .onConflictDoNothing()
      .returning({ id: externalEventQueue.id })
    if (!inserted.length) return null
    const [row] = await this.database.orm
      .select()
      .from(externalEventQueue)
      .where(eq(externalEventQueue.id, inserted[0]!.id))
    return row ? this.parse(row) : null
  }

  public async claimReady(
    providers: readonly string[],
    limit = 20,
  ): Promise<ExternalEventRecord[]> {
    if (!providers.length) return []
    const now = new Date().toISOString()
    const candidates = await this.database.orm
      .select({ id: externalEventQueue.id })
      .from(externalEventQueue)
      .where(
        and(
          or(eq(externalEventQueue.status, 'received'), eq(externalEventQueue.status, 'retrying')),
          inArray(externalEventQueue.provider, providers as string[]),
          or(isNull(externalEventQueue.nextAttemptAt), lte(externalEventQueue.nextAttemptAt, now)),
        ),
      )
      .orderBy(asc(externalEventQueue.receivedAt))
      .limit(limit)
    const claimed: ExternalEventRecord[] = []
    for (const candidate of candidates) {
      const rows = await this.database.orm
        .update(externalEventQueue)
        .set({
          attemptCount: sql`${externalEventQueue.attemptCount} + 1`,
          nextAttemptAt: null,
          status: 'processing',
        })
        .where(
          and(
            eq(externalEventQueue.id, candidate.id),
            inArray(externalEventQueue.status, ['received', 'retrying']),
          ),
        )
        .returning()
      if (rows[0]) claimed.push(this.parse(rows[0]))
    }
    return claimed
  }

  public async markProcessed(id: string): Promise<void> {
    await this.database.orm
      .update(externalEventQueue)
      .set({ lastErrorCode: null, processedAt: new Date().toISOString(), status: 'processed' })
      .where(eq(externalEventQueue.id, id))
  }

  public async markFailed(id: string, errorCode: string, retryAt: string | null): Promise<void> {
    await this.database.orm
      .update(externalEventQueue)
      .set({
        lastErrorCode: errorCode,
        nextAttemptAt: retryAt,
        status: retryAt ? 'retrying' : 'dead_letter',
      })
      .where(eq(externalEventQueue.id, id))
  }

  public async prune(now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - EXTERNAL_EVENT_RETENTION_MS).toISOString()
    await this.database.orm
      .delete(externalEventQueue)
      .where(
        and(
          lte(externalEventQueue.receivedAt, cutoff),
          inArray(externalEventQueue.status, ['processed', 'dead_letter']),
        ),
      )
  }

  public maxAttempts(): number {
    return MAX_ATTEMPTS
  }

  private parse(row: typeof externalEventQueue.$inferSelect): ExternalEventRecord {
    return ExternalEventRecordSchema.parse({
      attemptCount: row.attemptCount,
      eventId: row.eventId,
      eventType: row.eventType,
      id: row.id,
      lastErrorCode: row.lastErrorCode,
      nextAttemptAt: row.nextAttemptAt,
      processedAt: row.processedAt,
      provider: row.provider,
      receivedAt: row.receivedAt,
      status: row.status,
    })
  }
}
