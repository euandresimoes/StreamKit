import { z } from 'zod'

export const TournamentStatusSchema = z.enum([
  'draft',
  'ready',
  'in_progress',
  'finished',
  'archived',
])
export const TournamentMatchStatusSchema = z.enum([
  'pending',
  'ready',
  'in_progress',
  'finished',
  'cancelled',
])
export const TournamentSizeSchema = z.union([
  z.literal(4),
  z.literal(8),
  z.literal(16),
  z.literal(32),
])
export const TournamentNameSchema = z.string().trim().min(1).max(120)
export const TournamentParticipantNameSchema = z.string().trim().min(1).max(200)
export const CreateTournamentRequestSchema = z.object({
  bracketSize: TournamentSizeSchema,
  description: z.string().trim().max(1000).nullable().default(null),
  mode: z.literal('individual'),
  name: TournamentNameSchema,
})
export const AddTournamentParticipantRequestSchema = z.object({
  displayName: TournamentParticipantNameSchema,
})
export const RenameTournamentParticipantRequestSchema = AddTournamentParticipantRequestSchema
export const ReorderTournamentParticipantRequestSchema = z.object({
  seed: z.number().int().positive(),
})
export const SetTournamentWinnerRequestSchema = z.object({ winnerEntryId: z.uuid() })
export const TournamentSchema = z.object({
  bracketSize: TournamentSizeSchema,
  createdAt: z.iso.datetime(),
  description: z.string().nullable(),
  id: z.uuid(),
  mode: z.literal('individual'),
  name: TournamentNameSchema,
  status: TournamentStatusSchema,
  updatedAt: z.iso.datetime(),
})
export const TournamentParticipantSchema = z.object({
  createdAt: z.iso.datetime(),
  displayName: TournamentParticipantNameSchema,
  entryId: z.uuid(),
  id: z.uuid(),
  seed: z.number().int().positive(),
  tournamentId: z.uuid(),
})
export const TournamentMatchSchema = z.object({
  id: z.uuid(),
  leftEntryId: z.uuid().nullable(),
  matchNumber: z.number().int().positive(),
  nextMatchId: z.uuid().nullable(),
  nextSlot: z.enum(['left', 'right']).nullable(),
  rightEntryId: z.uuid().nullable(),
  roundNumber: z.number().int().positive(),
  status: TournamentMatchStatusSchema,
  tournamentId: z.uuid(),
  updatedAt: z.iso.datetime(),
  winnerEntryId: z.uuid().nullable(),
})
export const TournamentAuditEntrySchema = z.object({
  action: z.string().min(1),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
  payload: z.record(z.string(), z.unknown()),
  tournamentId: z.uuid(),
})
export const TournamentDetailSchema = z.object({
  auditLog: z.array(TournamentAuditEntrySchema),
  championEntryId: z.uuid().nullable(),
  matches: z.array(TournamentMatchSchema),
  participants: z.array(TournamentParticipantSchema),
  tournament: TournamentSchema,
})
export const TournamentListSchema = z.object({ items: z.array(TournamentSchema) })
export type CreateTournamentRequest = z.infer<typeof CreateTournamentRequestSchema>
export type Tournament = z.infer<typeof TournamentSchema>
export type TournamentDetail = z.infer<typeof TournamentDetailSchema>
export type TournamentMatch = z.infer<typeof TournamentMatchSchema>
export type TournamentParticipant = z.infer<typeof TournamentParticipantSchema>
