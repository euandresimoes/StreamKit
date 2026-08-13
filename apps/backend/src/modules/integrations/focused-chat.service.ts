import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'

import { ApiApplicationError } from '../../application/api-error'
import { GiveawayRepository } from '../giveaway/giveaway.repository'
import { TournamentRepository } from '../tournament/tournament.repository'
import { type FocusedChatKey, FocusedChatRepository } from './focused-chat.repository'
import { IntegrationEventBus } from './integration-event.bus'

@Injectable()
export class FocusedChatService implements OnApplicationBootstrap, OnModuleDestroy {
  private unsubscribe: (() => void) | null = null

  public constructor(
    @Inject(FocusedChatRepository) private readonly chat: FocusedChatRepository,
    @Inject(IntegrationEventBus) private readonly events: IntegrationEventBus,
    @Inject(GiveawayRepository) private readonly giveaways: GiveawayRepository,
    @Inject(TournamentRepository) private readonly tournaments: TournamentRepository,
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
    return this.chat.thread(winner?.displayName ?? detail.giveaway.name, this.keyFor(winner))
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
        this.keyFor(champion),
      )
    }
    const team = detail.teams.find((item) => item.entryId === detail.championEntryId)
    const memberIds = new Set(
      detail.teamMembers
        .filter((member) => member.teamId === team?.id)
        .map((member) => member.participantId),
    )
    const keys = detail.participants.flatMap((participant) =>
      memberIds.has(participant.id) ? this.keyFor(participant) : [],
    )
    return this.chat.thread(team?.name ?? detail.tournament.name, keys)
  }

  private keyFor(
    participant:
      | {
          channelId: string | null
          displayName: string
          provider: 'kick' | 'twitch' | 'youtube' | null
          providerUserId: string | null
        }
      | undefined,
  ): FocusedChatKey[] {
    return participant?.channelId && participant.provider && participant.providerUserId
      ? [
          {
            channelId: participant.channelId,
            displayName: participant.displayName,
            provider: participant.provider,
            providerUserId: participant.providerUserId,
          },
        ]
      : []
  }
}
