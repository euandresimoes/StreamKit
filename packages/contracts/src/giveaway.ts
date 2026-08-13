import { z } from 'zod'

export const ParticipantSourceSchema = z.enum(['manual', 'livepix'])
export const GiveawayStatusSchema = z.enum([
  'draft',
  'ready',
  'drawing',
  'completed',
  'cancelled',
  'archived',
])
export const GiveawayModeSchema = z.enum(['wheel', 'case-opening'])
export const DuplicatePolicySchema = z.enum(['remove', 'keep', 'group-tickets'])
export const GiveawayNameSchema = z.string().trim().min(1).max(120)
export const ParticipantNameSchema = z.string().trim().min(1).max(200)
export const ParseParticipantsRequestSchema = z.object({
  input: z.string().max(2_000_000),
  policy: DuplicatePolicySchema,
})
export const ParsedParticipantSchema = z.object({
  displayName: ParticipantNameSchema,
  normalizedName: z.string().min(1),
  ticketCount: z.number().int().positive(),
})
export const ParticipantPreviewSchema = z.object({
  entries: z.array(ParsedParticipantSchema),
  inputCount: z.number().int().nonnegative(),
  ticketCount: z.number().int().nonnegative(),
  validCount: z.number().int().nonnegative(),
})
export const CreateGiveawayRequestSchema = z.object({
  duplicatePolicy: DuplicatePolicySchema,
  mode: GiveawayModeSchema,
  name: GiveawayNameSchema,
})
export const UpdateGiveawayRequestSchema = z.object({
  mode: GiveawayModeSchema,
  name: GiveawayNameSchema,
})
export const UpdateGiveawayModeRequestSchema = z.object({ mode: GiveawayModeSchema })
export const GiveawaySchema = z.object({
  createdAt: z.iso.datetime(),
  duplicatePolicy: DuplicatePolicySchema,
  id: z.uuid(),
  mode: GiveawayModeSchema,
  name: GiveawayNameSchema,
  source: ParticipantSourceSchema,
  status: GiveawayStatusSchema,
  updatedAt: z.iso.datetime(),
})
export const GiveawayParticipantSchema = z.object({
  createdAt: z.iso.datetime(),
  displayName: ParticipantNameSchema,
  giveawayId: z.uuid(),
  id: z.uuid(),
  normalizedName: z.string().min(1),
  ticketCount: z.number().int().positive(),
})
export const ImportParticipantsRequestSchema = ParseParticipantsRequestSchema
export const NextGiveawayRoundRequestSchema = z.object({ removeWinner: z.boolean() })
export const GiveawayRoundEntrySchema = z.object({
  displayName: ParticipantNameSchema,
  participantId: z.uuid(),
  ticketCount: z.number().int().positive(),
})
export const GiveawayRoundSchema = z.object({
  completedAt: z.iso.datetime().nullable(),
  giveawayId: z.uuid(),
  id: z.uuid(),
  mode: GiveawayModeSchema,
  randomProof: z.string().regex(/^[a-f0-9]{64}$/),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  startedAt: z.iso.datetime(),
  status: z.enum(['drawing', 'completed']),
  ticketCount: z.number().int().positive(),
  winnerParticipantId: z.uuid(),
  entries: z.array(GiveawayRoundEntrySchema),
})
export const GiveawayDetailSchema = z.object({
  giveaway: GiveawaySchema,
  participants: z.array(GiveawayParticipantSchema),
  activeRound: GiveawayRoundSchema.nullable(),
})
export const GiveawayListSchema = z.object({ items: z.array(GiveawaySchema) })
export const GiveawayHistorySchema = z.object({ items: z.array(GiveawayRoundSchema) })
export type ParticipantSource = z.infer<typeof ParticipantSourceSchema>
export type DuplicatePolicy = z.infer<typeof DuplicatePolicySchema>
export type ParsedParticipant = z.infer<typeof ParsedParticipantSchema>
export type ParticipantPreview = z.infer<typeof ParticipantPreviewSchema>
export type CreateGiveawayRequest = z.infer<typeof CreateGiveawayRequestSchema>
export type UpdateGiveawayModeRequest = z.infer<typeof UpdateGiveawayModeRequestSchema>
export type UpdateGiveawayRequest = z.infer<typeof UpdateGiveawayRequestSchema>
export type Giveaway = z.infer<typeof GiveawaySchema>
export type GiveawayParticipant = z.infer<typeof GiveawayParticipantSchema>
export type GiveawayRound = z.infer<typeof GiveawayRoundSchema>
export type GiveawayRoundEntry = z.infer<typeof GiveawayRoundEntrySchema>
export type GiveawayDetail = z.infer<typeof GiveawayDetailSchema>
export type GiveawayHistory = z.infer<typeof GiveawayHistorySchema>
