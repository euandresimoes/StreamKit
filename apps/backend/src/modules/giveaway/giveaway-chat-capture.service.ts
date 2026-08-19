import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import type { GiveawayCaptureRule, SaveGiveawayCaptureRuleRequest } from '@streamlet/contracts'

import { ApiApplicationError } from '../../application/api-error'
import { IntegrationEventBus } from '../integrations/integration-event.bus'
import { IntegrationRepository } from '../integrations/integration.repository'
import { matchesGiveawayCaptureRule } from './domain/chat-capture-rule'
import { GiveawayCaptureRepository } from './giveaway-capture.repository'
import { GiveawayRepository } from './giveaway.repository'

@Injectable()
export class GiveawayChatCaptureService implements OnApplicationBootstrap, OnModuleDestroy {
  private unsubscribe: (() => void) | null = null
  private expirationTimer: ReturnType<typeof setInterval> | null = null

  public constructor(
    @Inject(GiveawayCaptureRepository) private readonly captures: GiveawayCaptureRepository,
    @Inject(GiveawayRepository) private readonly giveaways: GiveawayRepository,
    @Inject(IntegrationEventBus) private readonly events: IntegrationEventBus,
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
  ) {}

  public onApplicationBootstrap(): void {
    this.unsubscribe = this.events.subscribe(async (event) => {
      await this.captures.linkIdentity(event)
      const rules = await this.captures.findForEvent(event)
      for (const rule of rules) {
        if (matchesGiveawayCaptureRule(rule, event, new Date(event.occurredAt)))
          await this.captures.capture(rule, event)
      }
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

  public list(giveawayId: string) {
    return this.captures.list(giveawayId)
  }

  public async save(giveawayId: string, input: SaveGiveawayCaptureRuleRequest) {
    if (!(await this.giveaways.detail(giveawayId)))
      throw new ApiApplicationError('GIVEAWAY_NOT_FOUND', 'Giveaway not found', 404)
    if (!(await this.integrations.getConnection(input.connectionId)))
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_NOT_FOUND',
        'Integration connection not found',
        404,
      )
    return this.captures.save(giveawayId, input)
  }

  public updateStatus(ruleId: string, status: GiveawayCaptureRule['status']) {
    return this.captures.updateStatus(ruleId, status)
  }
}
