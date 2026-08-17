import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
  Optional,
} from '@nestjs/common'

import { ApiApplicationError } from '../../application/api-error'
import { GiveawayRepository } from '../giveaway/giveaway.repository'
import { TournamentRepository } from '../tournament/tournament.repository'
import { type FocusedChatKey, FocusedChatRepository } from './focused-chat.repository'
import { IntegrationEventBus } from './integration-event.bus'
import { IntegrationRepository } from './integration.repository'

@Injectable()
export class FocusedChatService implements OnApplicationBootstrap, OnModuleDestroy {
  private unsubscribe: (() => void) | null = null

  public constructor(
    @Inject(FocusedChatRepository) private readonly chat: FocusedChatRepository,
    @Inject(IntegrationEventBus) private readonly events: IntegrationEventBus,
    @Inject(GiveawayRepository) private readonly giveaways: GiveawayRepository,
    @Inject(TournamentRepository) private readonly tournaments: TournamentRepository,
    @Optional() @Inject(IntegrationRepository) private readonly integrations?: IntegrationRepository,
  ) {}

  public onApplicationBootstrap(): void {
    this.unsubscribe = this.events.subscribe((event) => this.chat.append(event))
  }

  public onModuleDestroy(): void {
    this.unsubscribe?.()
  }

  public async forGiveaway(id: string) {
    const detail = await this.giveaways.detail(id)
    if (!detail) throw new ApiApplicationError('GIVEAWAY_NOT_FOUND', 'Giveaway not found', 404)
    const winnerId = detail.activeRound?.winnerParticipantId
    const winner = detail.participants.find((participant) => participant.id === winnerId)
    return this.chat.thread(
      winner?.providerUserId ?? winner?.displayName ?? detail.giveaway.name,
      await this.keysFor(winner),
    )
  }

  public async forTournament(id: string) {
    const detail = await this.tournaments.detail(id)
    if (!detail) throw new ApiApplicationError('TOURNAMENT_NOT_FOUND', 'Tournament not found', 404)
    if (!detail.championEntryId) return this.chat.thread(detail.tournament.name, [])
    if (detail.tournament.mode === 'individual') {
      const champion = detail.participants.find(
        (participant) => participant.entryId === detail.championEntryId,
      )
      return this.chat.thread(
        champion?.displayName ?? detail.tournament.name,
        await this.keysFor(champion),
      )
    }
    const team = detail.teams.find((item) => item.entryId === detail.championEntryId)
    const memberIds = new Set(
      detail.teamMembers
        .filter((member) => member.teamId === team?.id)
        .map((member) => member.participantId),
    )
    const keys = (
      await Promise.all(
        detail.participants
          .filter((participant) => memberIds.has(participant.id))
          .map((participant) => this.keysFor(participant)),
      )
    ).flat()
    return this.chat.thread(team?.name ?? detail.tournament.name, keys)
  }

  public async forTournamentMatch(id: string, matchId: string, side: 'left' | 'right') {
    const detail = await this.tournaments.detail(id)
    if (!detail) throw new ApiApplicationError('TOURNAMENT_NOT_FOUND', 'Tournament not found', 404)
    const match = detail.matches.find((item) => item.id === matchId)
    if (!match)
      throw new ApiApplicationError('TOURNAMENT_MATCH_NOT_FOUND', 'Tournament match not found', 404)
    const entryId = side === 'left' ? match.leftEntryId : match.rightEntryId
    if (!entryId) return this.chat.thread('A definir', [])
    if (detail.tournament.mode === 'individual') {
      const participant = detail.participants.find((item) => item.entryId === entryId)
      return this.chat.thread(
        participant?.displayName ?? 'Participante',
        await this.keysFor(participant),
      )
    }
    const team = detail.teams.find((item) => item.entryId === entryId)
    const memberIds = new Set(
      detail.teamMembers
        .filter((member) => member.teamId === team?.id)
        .map((member) => member.participantId),
    )
    const keys = (
      await Promise.all(
        detail.participants
          .filter((participant) => memberIds.has(participant.id))
          .map((participant) => this.keysFor(participant)),
      )
    ).flat()
    return this.chat.thread(team?.name ?? 'Equipe', keys)
  }

  private async keysFor(
    participant:
      | {
          channelId: string | null
          displayName: string
          provider: 'kick' | 'twitch' | 'youtube' | null
          providerUserId: string | null
        }
      | undefined,
  ): Promise<FocusedChatKey[]> {
    if (!participant) return []

    const connections = (this.integrations ? await this.integrations.listConnections() : []).filter(
      (connection) =>
        connection.capabilities.includes('chat.read') &&
        (!participant.provider || connection.provider === participant.provider) &&
        (!participant.channelId || connection.channelId === participant.channelId),
    )
    const candidates = connections.length
      ? connections
      : participant.provider && participant.channelId
        ? [
            {
              channelId: participant.channelId,
              provider: participant.provider,
            },
          ]
        : []

    return candidates.map((connection) => ({
      channelId: connection.channelId,
      displayName: participant.displayName,
      identityKey: participant.displayName,
      provider: connection.provider,
      providerUserId: participant.providerUserId,
    }))
  }
}
