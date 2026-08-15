import { z } from 'zod'

export const ExternalEventProviderSchema = z.enum(['kick', 'livepix', 'twitch', 'youtube'])
export const ExternalEventStatusSchema = z.enum([
  'received',
  'processing',
  'processed',
  'retrying',
  'dead_letter',
])
export const ExternalTransportStateSchema = z.enum([
  'disabled',
  'starting',
  'ready',
  'degraded',
  'stopped',
  'error',
])
export const ExternalTransportModeSchema = z.enum(['loopback', 'tunnel'])

export const ExternalEventRecordSchema = z.object({
  attemptCount: z.number().int().nonnegative(),
  eventId: z.string().trim().min(1).max(300),
  eventType: z.string().trim().min(1).max(200),
  id: z.uuid(),
  lastErrorCode: z.string().nullable(),
  nextAttemptAt: z.iso.datetime().nullable(),
  processedAt: z.iso.datetime().nullable(),
  provider: ExternalEventProviderSchema,
  receivedAt: z.iso.datetime(),
  status: ExternalEventStatusSchema,
})

export const ExternalEventIngressSchema = z.object({
  eventId: z.string().trim().min(1).max(300),
  eventType: z.string().trim().min(1).max(200),
  payload: z.unknown(),
  timestamp: z.iso.datetime(),
})

export const ExternalTransportSnapshotSchema = z.object({
  endpointCount: z.number().int().nonnegative(),
  lastErrorCode: z.string().nullable(),
  mode: ExternalTransportModeSchema.nullable(),
  publicUrl: z.url().nullable(),
  startedAt: z.iso.datetime().nullable(),
  state: ExternalTransportStateSchema,
})

export type ExternalEventProvider = z.infer<typeof ExternalEventProviderSchema>
export type ExternalEventRecord = z.infer<typeof ExternalEventRecordSchema>
export type ExternalEventIngress = z.infer<typeof ExternalEventIngressSchema>
export type ExternalTransportSnapshot = z.infer<typeof ExternalTransportSnapshotSchema>
