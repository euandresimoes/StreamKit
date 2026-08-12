import {
  GiveawayDetailSchema,
  GiveawayHistorySchema,
  GiveawayRoundSchema,
  GiveawaySchema,
  ParticipantPreviewSchema,
} from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'
import { type LocalBackendHandle, startLocalBackend } from '../src/main'

const token = 'c'.repeat(64)
const auth = { authorization: `Bearer ${token}` }
describe('Giveaway API integrity', () => {
  let backend: LocalBackendHandle | undefined
  afterEach(async () => {
    await backend?.close()
    backend = undefined
  })
  const call = (path: string, method = 'GET', body?: unknown) =>
    fetch(`${backend!.baseUrl}${path}`, {
      method,
      headers: body === undefined ? auth : { ...auth, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  it('previews, freezes, recovers and completes an auditable round', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const preview = ParticipantPreviewSchema.parse(
      await (
        await call('/api/v1/giveaways/parse-participants', 'POST', {
          input: 'Ana, ana\nBia',
          policy: 'group-tickets',
        })
      ).json(),
    )
    expect(preview.ticketCount).toBe(3)
    const giveaway = GiveawaySchema.parse(
      await (
        await call('/api/v1/giveaways', 'POST', {
          duplicatePolicy: 'group-tickets',
          mode: 'wheel',
          name: 'Live',
        })
      ).json(),
    )
    await call(`/api/v1/giveaways/${giveaway.id}/participants/import`, 'POST', {
      input: 'Ana, ana\nBia',
      policy: 'group-tickets',
    })
    await call(`/api/v1/giveaways/${giveaway.id}/prepare`, 'POST')
    const round = GiveawayRoundSchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}/draw`, 'POST')).json(),
    )
    expect(round.ticketCount).toBe(3)
    expect(round.entries).toHaveLength(2)
    expect(
      (
        await call(`/api/v1/giveaways/${giveaway.id}/participants/import`, 'POST', {
          input: 'Outra',
          policy: 'remove',
        })
      ).status,
    ).toBe(409)
    expect((await call(`/api/v1/giveaways/${giveaway.id}/cancel`, 'POST')).status).toBe(409)
    await backend.close()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const recovered = GiveawayDetailSchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}`)).json(),
    )
    expect(recovered.activeRound).toEqual(round)
    expect(recovered.giveaway.status).toBe('drawing')
    const completed = GiveawayRoundSchema.parse(
      await (
        await call(`/api/v1/giveaways/${giveaway.id}/rounds/${round.id}/complete`, 'POST')
      ).json(),
    )
    expect(completed.winnerParticipantId).toBe(round.winnerParticipantId)
    expect((await call(`/api/v1/giveaways/${giveaway.id}/draw`, 'POST')).status).toBe(409)
    const history = GiveawayHistorySchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}/history`)).json(),
    )
    expect(history.items[0]).toEqual(completed)
    const archived = GiveawaySchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}/archive`, 'POST')).json(),
    )
    expect(archived.status).toBe('archived')
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })
  it('allows cancellation only before winner selection', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const giveaway = GiveawaySchema.parse(
      await (
        await call('/api/v1/giveaways', 'POST', {
          duplicatePolicy: 'remove',
          mode: 'case-opening',
          name: 'Cancelar',
        })
      ).json(),
    )
    expect(
      GiveawaySchema.parse(
        await (await call(`/api/v1/giveaways/${giveaway.id}/cancel`, 'POST')).json(),
      ).status,
    ).toBe('cancelled')
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })
})
