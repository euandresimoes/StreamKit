import { createIsolatedTestEnvironment } from '@streamkit/test-utils'
import {
  GiveawayDetailSchema,
  GiveawayRoundSchema,
  GiveawaySchema,
  TodoBoardSchema,
  TodoCardSchema,
  TodoColumnSchema,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from '@streamkit/contracts'
import { type LocalBackendHandle, startLocalBackend } from '@streamkit/backend'

const token = 'b'.repeat(64)

function headers(): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }
}

describe('desktop E2E harness', () => {
  it('never points at the real StreamKit user data directory', async () => {
    const environment = await createIsolatedTestEnvironment()

    expect(environment.userDataPath).toContain('streamkit-test-')
    expect(environment.databasePath).toContain('streamkit.test.db')

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
})
