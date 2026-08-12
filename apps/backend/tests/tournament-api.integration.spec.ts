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

  it('moves unique team members transactionally and completes a team bracket', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const tournament = TournamentSchema.parse(
      await (
        await call('/api/v1/tournaments', 'POST', {
          bracketSize: 4,
          description: null,
          mode: 'team',
          name: 'Times',
          teamCapacity: 2,
        })
      ).json(),
    )
    let detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
    )
    expect(detail.teams).toEqual([])
    for (const name of ['Azul', 'Verde', 'Roxo', 'Laranja'])
      detail = TournamentDetailSchema.parse(
        await (
          await call(`/api/v1/tournaments/${tournament.id}/teams`, 'POST', { color: null, name })
        ).json(),
      )
    const [blue, green, purple, orange] = detail.teams
    detail = TournamentDetailSchema.parse(
      await (
        await call(`/api/v1/tournaments/${tournament.id}/teams/${blue!.id}/members`, 'POST', {
          displayName: 'Ana',
          slotPosition: 1,
        })
      ).json(),
    )
    expect(detail.teamMembers).toHaveLength(1)
    expect(
      (
        await call(`/api/v1/tournaments/${tournament.id}/teams/${green!.id}/members`, 'POST', {
          displayName: ' ana ',
          slotPosition: 1,
        })
      ).status,
    ).toBe(409)
    await call(`/api/v1/tournaments/${tournament.id}/teams/${green!.id}/members`, 'POST', {
      displayName: 'Bia',
      slotPosition: 1,
    })
    const competing = await Promise.all([
      call(`/api/v1/tournaments/${tournament.id}/teams/${purple!.id}/members`, 'POST', {
        displayName: 'Caio',
        slotPosition: 1,
      }),
      call(`/api/v1/tournaments/${tournament.id}/teams/${purple!.id}/members`, 'POST', {
        displayName: 'Duda',
        slotPosition: 1,
      }),
    ])
    expect(competing.map((response) => response.status).sort()).toEqual([201, 409])
    await call(`/api/v1/tournaments/${tournament.id}/teams/${orange!.id}/members`, 'POST', {
      displayName: 'Eva',
      slotPosition: 1,
    })
    const duplicatePerson = await Promise.all([
      call(`/api/v1/tournaments/${tournament.id}/teams/${purple!.id}/members`, 'POST', {
        displayName: 'Fê',
        slotPosition: 2,
      }),
      call(`/api/v1/tournaments/${tournament.id}/teams/${orange!.id}/members`, 'POST', {
        displayName: ' FÊ ',
        slotPosition: 2,
      }),
    ])
    expect(duplicatePerson.map((response) => response.status).sort()).toEqual([201, 409])
    detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
    )
    const ana = detail.teamMembers.find((member) => member.displayName === 'Ana')!
    detail = TournamentDetailSchema.parse(
      await (
        await call(`/api/v1/tournaments/${tournament.id}/team-members/move`, 'POST', {
          memberId: ana.id,
          targetSlotPosition: 2,
          targetTeamId: green!.id,
        })
      ).json(),
    )
    expect(detail.teamMembers.find((member) => member.id === ana.id)).toMatchObject({
      slotPosition: 2,
      teamId: green!.id,
    })
    expect(
      (
        await call(`/api/v1/tournaments/${tournament.id}/teams/${green!.id}`, 'PATCH', {
          capacity: 1,
          color: '#00ff00',
          name: 'Verde novo',
        })
      ).status,
    ).toBe(409)
    detail = TournamentDetailSchema.parse(
      await (
        await call(`/api/v1/tournaments/${tournament.id}/teams/${green!.id}`, 'PATCH', {
          capacity: 2,
          color: '#00ff00',
          name: 'Verde novo',
        })
      ).json(),
    )
    expect(detail.teams.find((team) => team.id === green!.id)).toMatchObject({
      color: '#00ff00',
      name: 'Verde novo',
    })
    detail = TournamentDetailSchema.parse(
      await (await call(`/api/v1/tournaments/${tournament.id}/bracket/generate`, 'POST')).json(),
    )
    await call(`/api/v1/tournaments/${tournament.id}/start`, 'POST')
    for (const match of detail.matches.filter((item) => item.roundNumber === 1))
      detail = TournamentDetailSchema.parse(
        await (
          await call(`/api/v1/tournaments/${tournament.id}/matches/${match.id}/winner`, 'POST', {
            winnerEntryId: match.leftEntryId,
          })
        ).json(),
      )
    const final = detail.matches.find((match) => match.roundNumber === 2)!
    detail = TournamentDetailSchema.parse(
      await (
        await call(`/api/v1/tournaments/${tournament.id}/matches/${final.id}/winner`, 'POST', {
          winnerEntryId: final.leftEntryId,
        })
      ).json(),
    )
    expect(detail.championEntryId).toBe(final.leftEntryId)
    expect(detail.auditLog.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'team.added',
        'team_member.added',
        'team_member.moved',
        'match.winner_set',
      ]),
    )
  })
})
