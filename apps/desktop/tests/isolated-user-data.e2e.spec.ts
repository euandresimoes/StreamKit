import { createIsolatedTestEnvironment } from '@streamlet/test-utils'
import {
  AppSettingsSchema,
  GiveawayDetailSchema,
  GiveawayRoundSchema,
  GiveawaySchema,
  TodoBoardSchema,
  TodoCardSchema,
  TodoColumnSchema,
  TournamentDetailSchema,
  TournamentListSchema,
  TournamentSchema,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from '@streamlet/contracts'
import { type LocalBackendHandle, startLocalBackend } from '@streamlet/backend'

const token = 'b'.repeat(64)

function headers(): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }
}

describe('desktop E2E harness', () => {
  it('never points at the real Streamlet user data directory', async () => {
    const environment = await createIsolatedTestEnvironment()

    expect(environment.userDataPath).toContain('streamlet-test-')
    expect(environment.databasePath).toContain('streamlet.test.db')

    await environment.cleanup()
  })

  it('restores the workspace vertical slice after an application-style restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    let backend: LocalBackendHandle = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })

    const createResponse = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      body: JSON.stringify({ name: 'Persistido' }),
      headers: headers(),
      method: 'POST',
    })
    const created = WorkspaceSchema.parse(await createResponse.json())
    await backend.close()

    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const listResponse = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      headers: headers(),
    })
    const list = WorkspaceListResponseSchema.parse(await listResponse.json())

    expect(list.items).toEqual([created])

    await backend.close()
    await environment.cleanup()
  })

  it('restores columns, cards and their moved order after restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    let backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const call = (path: string, method = 'GET', body?: unknown) =>
      fetch(`${backend.baseUrl}${path}`, {
        method,
        headers: body === undefined ? { authorization: `Bearer ${token}` } : headers(),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    const workspace = WorkspaceSchema.parse(
      await (await call('/api/v1/todo/workspaces', 'POST', { name: 'Kanban' })).json(),
    )
    const first = TodoColumnSchema.parse(
      await (
        await call(`/api/v1/todo/workspaces/${workspace.id}/columns`, 'POST', { name: 'A fazer' })
      ).json(),
    )
    const second = TodoColumnSchema.parse(
      await (
        await call(`/api/v1/todo/workspaces/${workspace.id}/columns`, 'POST', { name: 'Feito' })
      ).json(),
    )
    const card = TodoCardSchema.parse(
      await (
        await call(`/api/v1/todo/columns/${first.id}/cards`, 'POST', { title: 'Persistir' })
      ).json(),
    )
    await call(`/api/v1/todo/cards/${card.id}/move`, 'POST', { columnId: second.id, position: 0 })
    await backend.close()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const board = TodoBoardSchema.parse(
      await (await call(`/api/v1/todo/workspaces/${workspace.id}`)).json(),
    )
    expect(board.cards[0]?.columnId).toBe(second.id)
    await backend.close()
    await environment.cleanup()
  })
  it.each(['wheel', 'case-opening'] as const)(
    'persists a %s winner across restart',
    async (mode) => {
      const environment = await createIsolatedTestEnvironment()
      let backend = await startLocalBackend({
        authenticationToken: token,
        databasePath: environment.databasePath,
      })
      const call = (path: string, method = 'GET', body?: unknown) =>
        fetch(`${backend.baseUrl}${path}`, {
          method,
          headers: body === undefined ? { authorization: `Bearer ${token}` } : headers(),
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        })
      const giveaway = GiveawaySchema.parse(
        await (
          await call('/api/v1/giveaways', 'POST', { duplicatePolicy: 'remove', mode, name: mode })
        ).json(),
      )
      const imported = await call(`/api/v1/giveaways/${giveaway.id}/participants/import`, 'POST', {
        input: 'Ana,Bia',
        policy: 'remove',
      })
      expect(imported.status).toBe(201)
      const prepared = await call(`/api/v1/giveaways/${giveaway.id}/prepare`, 'POST')
      expect(prepared.status).toBe(201)
      const drawn = await call(`/api/v1/giveaways/${giveaway.id}/draw`, 'POST')
      expect(drawn.status).toBe(201)
      const round = GiveawayRoundSchema.parse(await drawn.json())
      await backend.close()
      backend = await startLocalBackend({
        authenticationToken: token,
        databasePath: environment.databasePath,
      })
      expect(
        GiveawayDetailSchema.parse(await (await call(`/api/v1/giveaways/${giveaway.id}`)).json())
          .activeRound,
      ).toEqual(round)
      await backend.close()
      await environment.cleanup()
    },
  )

  it('completes and restores an individual tournament champion', async () => {
    const environment = await createIsolatedTestEnvironment()
    let backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const call = (path: string, method = 'GET', body?: unknown) =>
      fetch(`${backend.baseUrl}${path}`, {
        method,
        headers: body === undefined ? { authorization: `Bearer ${token}` } : headers(),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    try {
      const tournament = TournamentSchema.parse(
        await (
          await call('/api/v1/tournaments', 'POST', {
            bracketSize: 4,
            description: null,
            mode: 'individual',
            name: 'E2E Cup',
          })
        ).json(),
      )
      for (const displayName of ['A', 'B', 'C', 'D'])
        await call(`/api/v1/tournaments/${tournament.id}/participants`, 'POST', { displayName })
      let detail = TournamentDetailSchema.parse(
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
      await backend.close()
      backend = await startLocalBackend({
        authenticationToken: token,
        databasePath: environment.databasePath,
      })
      const restored = TournamentDetailSchema.parse(
        await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
      )
      expect(restored.tournament.status).toBe('finished')
      expect(restored.championEntryId).toBe(detail.championEntryId)
    } finally {
      await backend.close()
      await environment.cleanup()
    }
  })

  it('moves team members and restores a team champion', async () => {
    const environment = await createIsolatedTestEnvironment()
    let backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const call = (path: string, method = 'GET', body?: unknown) =>
      fetch(`${backend.baseUrl}${path}`, {
        method,
        headers: body === undefined ? { authorization: `Bearer ${token}` } : headers(),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    try {
      const tournament = TournamentSchema.parse(
        await (
          await call('/api/v1/tournaments', 'POST', {
            bracketSize: 4,
            description: null,
            mode: 'team',
            name: 'Team Cup',
            teamCapacity: 2,
          })
        ).json(),
      )
      let detail = TournamentDetailSchema.parse(
        await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
      )
      const [first, second] = detail.teams
      detail = TournamentDetailSchema.parse(
        await (
          await call(`/api/v1/tournaments/${tournament.id}/teams/${first!.id}/members`, 'POST', {
            displayName: 'Jogador',
            slotPosition: 1,
          })
        ).json(),
      )
      await call(`/api/v1/tournaments/${tournament.id}/team-members/move`, 'POST', {
        memberId: detail.teamMembers[0]!.id,
        targetSlotPosition: 1,
        targetTeamId: second!.id,
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
      await backend.close()
      backend = await startLocalBackend({
        authenticationToken: token,
        databasePath: environment.databasePath,
      })
      const restored = TournamentDetailSchema.parse(
        await (await call(`/api/v1/tournaments/${tournament.id}`)).json(),
      )
      expect(restored.championEntryId).toBe(detail.championEntryId)
      expect(restored.teamMembers[0]).toMatchObject({ teamId: second!.id, slotPosition: 1 })
      expect(
        TournamentListSchema.parse(await (await call('/api/v1/tournaments')).json()).items.map(
          (item) => item.id,
        ),
      ).toContain(tournament.id)
    } finally {
      await backend.close()
      await environment.cleanup()
    }
  })

  it('synchronizes one persisted theme across two renderer-style clients and restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    let backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const request = (method = 'GET', body?: unknown) =>
      fetch(`${backend.baseUrl}/api/v1/settings`, {
        method,
        headers: body === undefined ? { authorization: `Bearer ${token}` } : headers(),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    try {
      await request('PUT', {
        confirmExitDuringActive: true,
        debugEnabled: false,
        minimizeToTray: false,
        openAtLogin: false,
        reduceMotion: true,
        theme: 'dark',
        updatePreference: 'notify',
      })
      const [mainRenderer, settingsRenderer] = await Promise.all([request(), request()])
      expect(AppSettingsSchema.parse(await mainRenderer.json()).theme).toBe('dark')
      expect(AppSettingsSchema.parse(await settingsRenderer.json()).reduceMotion).toBe(true)
      await backend.close()
      backend = await startLocalBackend({
        authenticationToken: token,
        databasePath: environment.databasePath,
      })
      expect(AppSettingsSchema.parse(await (await request()).json()).theme).toBe('dark')
    } finally {
      await backend.close()
      await environment.cleanup()
    }
  })
})
