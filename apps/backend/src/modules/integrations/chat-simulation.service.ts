import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ChatSimulationStatusSchema, type StartChatSimulationRequest } from '@streamkit/contracts'
import { IntegrationService } from './integration.service'

@Injectable()
export class ChatSimulationService {
  private generation = 0
  private state = ChatSimulationStatusSchema.parse({
    duplicateCount: 0,
    handlerFailures: 0,
    id: null,
    processedCount: 0,
    queueDepth: 0,
    receivedCount: 0,
    running: false,
    startedAt: null,
  })
  public constructor(
    @Inject(IntegrationService) private readonly integrations: IntegrationService,
  ) {}
  public status() {
    return this.state
  }
  public start(input: StartChatSimulationRequest) {
    this.stop()
    const generation = ++this.generation
    this.state = {
      duplicateCount: 0,
      handlerFailures: 0,
      id: randomUUID(),
      processedCount: 0,
      queueDepth: input.count,
      receivedCount: 0,
      running: true,
      startedAt: new Date().toISOString(),
    }
    void this.emit(input, generation)
    return this.state
  }
  public stop() {
    this.generation += 1
    this.state = { ...this.state, queueDepth: 0, running: false }
    return this.state
  }
  private async emit(input: StartChatSimulationRequest, generation: number) {
    for (let index = 0; index < input.count && generation === this.generation; index += 1) {
      const identityIndex =
        input.duplicateEvery > 0 && index > 0 && index % input.duplicateEvery === 0
          ? index - 1
          : index
      const externalEventId = `simulation-${this.state.id}-${identityIndex}`
      const result = await this.integrations.ingest({
        author: {
          avatarUrl: null,
          displayName: `Simulado ${identityIndex + 1}`,
          handle: `sim_${identityIndex + 1}`,
          provider: input.provider,
          providerUserId: `simulated-${identityIndex + 1}`,
        },
        badges: [],
        channelId: input.channelId,
        externalEventId,
        message: input.message,
        occurredAt: new Date().toISOString(),
        provider: input.provider,
        roles: {
          isBot: false,
          isBroadcaster: false,
          isMember: true,
          isModerator: false,
        },
        type: 'chat.message',
      })
      this.state = {
        ...this.state,
        duplicateCount: this.state.duplicateCount + Number(result.duplicate),
        handlerFailures: this.state.handlerFailures + result.handlerFailures,
        processedCount: this.state.processedCount + Number(!result.duplicate),
        queueDepth: input.count - index - 1,
        receivedCount: this.state.receivedCount + 1,
      }
      if (input.mode === 'gradual') await new Promise((resolve) => setTimeout(resolve, 40))
      if (input.mode === 'burst' && index % 100 === 99)
        await new Promise((resolve) => setTimeout(resolve, 25))
    }
    if (generation === this.generation)
      this.state = { ...this.state, queueDepth: 0, running: false }
  }
}
