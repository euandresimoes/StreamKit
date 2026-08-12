import { TournamentDetailSchema, TournamentSchema } from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'
import { type LocalBackendHandle, startLocalBackend } from '../src/main'

const token = 'd'.repeat(64)
const auth = { authorization: `Bearer ${token}` }

describe('Tournament API', () => {
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

  it('persists, progresses, invalidates and completes an individual bracket', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const tournament = TournamentSchema.parse(
      await (
        await call('/api/v1/tournaments', 'POST', {
          bracketSize: 4,
          description: 'Final local',
          mode: 'individual',
          name: 'Copa',
        })
      ).json(),
    )
    expect(
      (await call(`/api/v1/tournaments/${tournament.id}/bracket/generate`, 'POST')).status,
    ).toBe(409)
    for (const displayName of ['Ana', 'Bia', 'Caio', 'Duda'])
      await call(`/api/v1/tournaments/${tournament.id}/participants`, 'POST', { displayName })
    let detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
    )
    await call(
      `/api/v1/tournaments/${tournament.id}/participants/${detail.participants[3]!.id}/reorder`,
      'POST',
      { seed: 1 },
    )
    detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}/bracket/generate`, 'POST')).json(),
    )
    expect(detail.matches).toHaveLength(3)
    await call(`/api/v1/tournaments/${tournament.id}/start`, 'POST')
    expect(
      (
        await call(`/api/v1/tournaments/${tournament.id}/participants`, 'POST', {
          displayName: 'Extra',
        })
      ).status,
    ).toBe(409)
    detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
    )
    for (const match of detail.matches.filter((item) => item.roundNumber === 1)) {
      detail = TournamentDetailSchema.parse(
        await (
          await call(`/api/v1/tournaments/${tournament.id}/matches/${match.id}/winner`, 'POST', {
            winnerEntryId: match.leftEntryId,
          })
        ).json(),
      )
    }
    const final = detail.matches.find((match) => match.roundNumber === 2)!
    detail = TournamentDetailSchema.parse(
      await (
        await call(`/api/v1/tournaments/${tournament.id}/matches/${final.id}/winner`, 'POST', {
          winnerEntryId: final.leftEntryId,
        })
      ).json(),
    )
    expect(detail.tournament.status).toBe('finished')
    expect(detail.championEntryId).toBe(final.leftEntryId)
    await backend.close()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
    )
    expect(detail.championEntryId).toBe(final.leftEntryId)
    const semifinal = detail.matches.find((match) => match.roundNumber === 1)!
    detail = TournamentDetailSchema.parse(
      await (
        await call(`/api/v1/tournaments/${tournament.id}/matches/${semifinal.id}/undo`, 'POST')
      ).json(),
    )
    expect(detail.tournament.status).toBe('in_progress')
    expect(detail.matches.find((match) => match.id === final.id)?.status).toBe('cancelled')
    expect(detail.auditLog.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['bracket.generated', 'match.winner_set', 'match.result_undone']),
    )
  })
})
