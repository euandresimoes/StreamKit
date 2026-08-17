import { z } from 'zod'

import {
  GiveawayCaptureEntryPolicySchema,
  GiveawayCaptureMatchSchema,
  GiveawayCaptureStatusSchema,
  SaveGiveawayCaptureRuleRequestSchema,
} from './giveaway'
import { IntegrationProviderSchema } from './integration'

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
export const TournamentSideResultSchema = z.enum(['pending', 'won', 'lost', 'forfeit', 'draw'])
// Bracket sizes grow without fixed presets. Any integer size is supported; the
// bracket generator adds byes when the size is not a power of two.
export const TournamentSizeSchema = z
  .number()
  .int()
  .min(2)
  .max(8192)
export const TournamentNameSchema = z.string().trim().min(1).max(120)
export const TournamentParticipantNameSchema = z.string().trim().min(1).max(200)
export const CreateTournamentRequestSchema = z
  .object({
    bracketSize: TournamentSizeSchema,
    description: z.string().trim().max(1000).nullable().default(null),
    mode: z.enum(['individual', 'team']),
    name: TournamentNameSchema,
    teamCapacity: z.number().int().min(1).max(16).nullable().default(null),
  })
  .superRefine((value, context) => {
    if (value.mode === 'team' && value.teamCapacity === null)
      context.addIssue({
        code: 'custom',
        message: 'Team capacity is required',
        path: ['teamCapacity'],
      })
    if (value.mode === 'individual' && value.teamCapacity !== null)
      context.addIssue({
        code: 'custom',
        message: 'Team capacity only applies to team tournaments',
        path: ['teamCapacity'],
      })
  })
export const AddTournamentParticipantRequestSchema = z.object({
  channelId: z.string().trim().min(1).max(200).nullable().default(null),
  displayName: TournamentParticipantNameSchema,
  provider: IntegrationProviderSchema.nullable().default(null),
})
export const UpdateTournamentRequestSchema = z.object({
  bracketSize: TournamentSizeSchema.optional(),
  description: z.string().trim().max(1000).nullable(),
  mode: z.enum(['individual', 'team']).optional(),
  name: TournamentNameSchema,
  teamCapacity: z.number().int().min(1).max(16).nullable().optional(),
})
export const RenameTournamentParticipantRequestSchema = AddTournamentParticipantRequestSchema
export const ReorderTournamentParticipantRequestSchema = z.object({
  seed: z.number().int().positive(),
})
export const SetTournamentWinnerRequestSchema = z.object({ winnerEntryId: z.uuid() })
export const CompleteTournamentMatchRequestSchema = z
  .object({
    leftResult: TournamentSideResultSchema,
    rightResult: TournamentSideResultSchema,
  })
  .refine(
    (value) =>
      (value.leftResult === 'won' && ['lost', 'forfeit'].includes(value.rightResult)) ||
      (value.rightResult === 'won' && ['lost', 'forfeit'].includes(value.leftResult)) ||
      (value.leftResult === 'draw' && value.rightResult === 'draw'),
    { message: 'Match result must be win/loss, win/forfeit or draw/draw' },
  )
export const CreateTournamentTeamRequestSchema = z.object({
  capacity: z.number().int().min(1).max(16).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  name: TournamentNameSchema,
})
export const RenameTournamentTeamRequestSchema = CreateTournamentTeamRequestSchema
export const AddTournamentTeamMemberRequestSchema = z.object({
  channelId: z.string().trim().min(1).max(200).nullable().default(null),
  displayName: TournamentParticipantNameSchema,
  provider: IntegrationProviderSchema.nullable().default(null),
  slotPosition: z.number().int().min(1).max(16),
})
export const AssignTournamentParticipantRequestSchema = z.object({
  participantId: z.uuid(),
  slotPosition: z.number().int().min(1).max(16),
})
export const MoveTournamentTeamMemberRequestSchema = z.object({
  memberId: z.uuid(),
  targetSlotPosition: z.number().int().min(1).max(16),
  targetTeamId: z.uuid(),
})
export const ReorderTournamentTeamRequestSchema = z.object({ seed: z.number().int().positive() })
export const TournamentSchema = z.object({
  bracketSize: TournamentSizeSchema,
  createdAt: z.iso.datetime(),
  description: z.string().nullable(),
  id: z.uuid(),
  currentMatchId: z.uuid().nullable(),
  mode: z.enum(['individual', 'team']),
  name: TournamentNameSchema,
  status: TournamentStatusSchema,
  teamCapacity: z.number().int().min(1).max(16).nullable(),
  updatedAt: z.iso.datetime(),
})
export const TournamentParticipantSchema = z.object({
  avatarUrl: z.string().nullable().default(null),
  channelId: z.string().nullable().default(null),
  createdAt: z.iso.datetime(),
  displayName: TournamentParticipantNameSchema,
  entryId: z.uuid().nullable(),
  id: z.uuid(),
  provider: z.enum(['kick', 'twitch', 'youtube']).nullable().default(null),
  providerUserId: z.string().nullable().default(null),
  seed: z.number().int().positive().nullable(),
  source: z.enum(['chat', 'manual', 'livepix']).default('manual'),
  tournamentId: z.uuid(),
})
export const TournamentTeamMemberSchema = z.object({
  createdAt: z.iso.datetime(),
  displayName: TournamentParticipantNameSchema,
  id: z.uuid(),
  participantId: z.uuid(),
  slotPosition: z.number().int().min(1).max(16),
  teamId: z.uuid(),
})
export const TournamentTeamSchema = z.object({
  capacity: z.number().int().min(1).max(16),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  createdAt: z.iso.datetime(),
  entryId: z.uuid(),
  id: z.uuid(),
  name: TournamentNameSchema,
  seed: z.number().int().positive(),
  tournamentId: z.uuid(),
  updatedAt: z.iso.datetime(),
})
export const TournamentMatchSchema = z.object({
  finishedAt: z.iso.datetime().nullable(),
  id: z.uuid(),
  leftEntryId: z.uuid().nullable(),
  leftResult: TournamentSideResultSchema,
  matchNumber: z.number().int().positive(),
  nextMatchId: z.uuid().nullable(),
  nextSlot: z.enum(['left', 'right']).nullable(),
  rightEntryId: z.uuid().nullable(),
  rightResult: TournamentSideResultSchema,
  roundNumber: z.number().int().positive(),
  status: TournamentMatchStatusSchema,
  startedAt: z.iso.datetime().nullable(),
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
  teamMembers: z.array(TournamentTeamMemberSchema),
  teams: z.array(TournamentTeamSchema),
  tournament: TournamentSchema,
})
export const TournamentListSchema = z.object({ items: z.array(TournamentSchema) })
export const TournamentCaptureMatchSchema = GiveawayCaptureMatchSchema
export const TournamentCaptureEntryPolicySchema = GiveawayCaptureEntryPolicySchema
export const TournamentCaptureStatusSchema = GiveawayCaptureStatusSchema
export const SaveTournamentCaptureRuleRequestSchema = SaveGiveawayCaptureRuleRequestSchema.refine(
  (value) => value.entryPolicy === 'unique',
  { message: 'Tournament chat capture only supports unique identities', path: ['entryPolicy'] },
)
export const TournamentCaptureRuleSchema = SaveTournamentCaptureRuleRequestSchema.safeExtend({
  capturedCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  duplicateCount: z.number().int().nonnegative(),
  id: z.uuid(),
  rejectedCount: z.number().int().nonnegative(),
  status: TournamentCaptureStatusSchema,
  tournamentId: z.uuid(),
  updatedAt: z.iso.datetime(),
})
export const TournamentCaptureRuleListSchema = z.object({
  items: z.array(TournamentCaptureRuleSchema),
})
export const UpdateTournamentCaptureStatusRequestSchema = z.object({
  status: TournamentCaptureStatusSchema,
})
export type CreateTournamentRequest = z.infer<typeof CreateTournamentRequestSchema>
export type CompleteTournamentMatchRequest = z.infer<typeof CompleteTournamentMatchRequestSchema>
export type UpdateTournamentRequest = z.infer<typeof UpdateTournamentRequestSchema>
export type Tournament = z.infer<typeof TournamentSchema>
export type TournamentDetail = z.infer<typeof TournamentDetailSchema>
export type TournamentMatch = z.infer<typeof TournamentMatchSchema>
export type TournamentParticipant = z.infer<typeof TournamentParticipantSchema>
export type TournamentTeam = z.infer<typeof TournamentTeamSchema>
export type TournamentTeamMember = z.infer<typeof TournamentTeamMemberSchema>
export type SaveTournamentCaptureRuleRequest = z.infer<
  typeof SaveTournamentCaptureRuleRequestSchema
>
export type TournamentCaptureRule = z.infer<typeof TournamentCaptureRuleSchema>
