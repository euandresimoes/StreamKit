import { z } from 'zod'

export const StreamletEventNameSchema = z.enum([
  'giveaway.changed',
  'integration.changed',
  'settings.changed',
  'todo.changed',
  'tournament.changed',
])

export const StreamletEventSchema = z.object({
  aggregateId: z.string().min(1),
  name: StreamletEventNameSchema,
  occurredAt: z.iso.datetime(),
})

export type StreamletEvent = z.infer<typeof StreamletEventSchema>
export type StreamletEventName = z.infer<typeof StreamletEventNameSchema>
