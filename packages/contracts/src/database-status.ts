import { z } from 'zod'

export const DatabaseStatusSchema = z.object({
  foreignKeys: z.literal(true),
  journalMode: z.literal('wal'),
  schemaVersion: z.number().int().nonnegative(),
})

export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>
