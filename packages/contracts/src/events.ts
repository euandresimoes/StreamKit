import { z } from 'zod'

export const StreamKitEventNameSchema = z.enum([
  'giveaway.changed',
  'settings.changed',
  'todo.changed',
  'tournament.changed',
])

export const StreamKitEventSchema = z.object({
  aggregateId: z.string().min(1),
  name: StreamKitEventNameSchema,
  occurredAt: z.iso.datetime(),
})

export type StreamKitEvent = z.infer<typeof StreamKitEventSchema>
export type StreamKitEventName = z.infer<typeof StreamKitEventNameSchema>
