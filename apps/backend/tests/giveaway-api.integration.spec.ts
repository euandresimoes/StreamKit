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
    await call(`/api/v1/giveaways/${giveaway.id}/participants/import`, 'POST', {
      input: 'Caio',
      policy: 'group-tickets',
    })
    const imported = GiveawayDetailSchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}`)).json(),
    )
    expect(imported.participants.map((item) => item.displayName)).toEqual(['Ana', 'Bia', 'Caio'])
    const participantToRemove = imported.participants.find((item) => item.displayName === 'Bia')!
    expect(
      (
        await call(
          `/api/v1/giveaways/${giveaway.id}/participants/${participantToRemove.id}`,
          'DELETE',
        )
      ).status,
    ).toBe(204)
    expect(
      GiveawayDetailSchema.parse(await (await call(`/api/v1/giveaways/${giveaway.id}`)).json())
        .participants,
    ).toHaveLength(2)
    await call(`/api/v1/giveaways/${giveaway.id}/participants/import`, 'POST', {
      input: 'Bia',
      policy: 'group-tickets',
    })
    await call(`/api/v1/giveaways/${giveaway.id}/prepare`, 'POST')
    const round = GiveawayRoundSchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}/draw`, 'POST')).json(),
    )
    expect(round.ticketCount).toBe(4)
    expect(round.entries).toHaveLength(3)
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
    const next = GiveawayDetailSchema.parse(
      await (
        await call(`/api/v1/giveaways/${giveaway.id}/next-round`, 'POST', { removeWinner: true })
      ).json(),
    )
    expect(next.giveaway.status).toBe('ready')
    expect(next.participants.some((item) => item.id === completed.winnerParticipantId)).toBe(false)
    expect(
      GiveawayHistorySchema.parse(
        await (await call(`/api/v1/giveaways/${giveaway.id}/history`)).json(),
      ).items[0],
    ).toEqual(completed)
    const resavedResponse = await call(
      `/api/v1/giveaways/${giveaway.id}/participants/import`,
      'POST',
      { input: 'Nova participante', policy: 'group-tickets' },
    )
    expect(resavedResponse.status).toBe(201)
    const resaved = GiveawayDetailSchema.parse(await resavedResponse.json())
    expect(resaved.participants.some((item) => item.displayName === 'Nova participante')).toBe(true)
    expect(
      GiveawayHistorySchema.parse(
        await (await call(`/api/v1/giveaways/${giveaway.id}/history`)).json(),
      ).items[0],
    ).toEqual(completed)
    const secondRound = GiveawayRoundSchema.parse(
      await (await call(`/api/v1/giveaways/${giveaway.id}/draw`, 'POST')).json(),
    )
    expect(secondRound.mode).toBe('wheel')
    await call(`/api/v1/giveaways/${giveaway.id}/rounds/${secondRound.id}/complete`, 'POST')
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
