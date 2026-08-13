import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import type { SaveTournamentCaptureRuleRequest, TournamentCaptureRule } from '@streamkit/contracts'

import { ApiApplicationError } from '../../application/api-error'
import { IntegrationEventBus } from '../integrations/integration-event.bus'
import { IntegrationRepository } from '../integrations/integration.repository'
import { matchesParticipantCaptureRule } from '../integrations/domain/participant-capture-rule'
import { TournamentCaptureRepository } from './tournament-capture.repository'
import { TournamentRepository } from './tournament.repository'

@Injectable()
export class TournamentChatCaptureService implements OnApplicationBootstrap, OnModuleDestroy {
  private unsubscribe: (() => void) | null = null
  private expirationTimer: ReturnType<typeof setInterval> | null = null

  public constructor(
    @Inject(TournamentCaptureRepository) private readonly captures: TournamentCaptureRepository,
    @Inject(TournamentRepository) private readonly tournaments: TournamentRepository,
    @Inject(IntegrationEventBus) private readonly events: IntegrationEventBus,
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
  ) {}

  public onApplicationBootstrap(): void {
    this.unsubscribe = this.events.subscribe(async (event) => {
      const rules = await this.captures.findForEvent(event)
      for (const rule of rules)
        if (matchesParticipantCaptureRule(rule, event, new Date(event.occurredAt)))
          await this.captures.capture(rule, event)
    })
    this.expirationTimer = setInterval(() => void this.captures.completeExpired(), 30_000)
    this.expirationTimer.unref?.()
  }

  public onModuleDestroy(): void {
    this.unsubscribe?.()
    if (this.expirationTimer) clearInterval(this.expirationTimer)
  }

  public delete(ruleId: string) {
    return this.captures.delete(ruleId)
  }

  public list(tournamentId: string) {
    return this.captures.list(tournamentId)
  }

  public async save(tournamentId: string, input: SaveTournamentCaptureRuleRequest) {
    if (!(await this.tournaments.detail(tournamentId)))
      throw new ApiApplicationError('TOURNAMENT_NOT_FOUND', 'Tournament not found', 404)
    if (!(await this.integrations.getConnection(input.connectionId)))
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_NOT_FOUND',
        'Integration connection not found',
        404,
      )
    return this.captures.save(tournamentId, input)
  }

  public updateStatus(ruleId: string, status: TournamentCaptureRule['status']) {
    return this.captures.updateStatus(ruleId, status)
  }
}
