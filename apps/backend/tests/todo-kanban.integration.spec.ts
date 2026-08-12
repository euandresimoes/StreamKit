import {
  TodoBoardSchema,
  TodoCardSchema,
  TodoColumnSchema,
  WorkspaceSchema,
} from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'
import { type LocalBackendHandle, startLocalBackend } from '../src/main'

const token = 'b'.repeat(64)
const authorization = { authorization: `Bearer ${token}` }
describe('TODO Kanban persistence', () => {
  let backend: LocalBackendHandle | undefined
  afterEach(async () => {
    await backend?.close()
    backend = undefined
  })
  const request = (path: string, method = 'GET', body?: unknown) =>
    fetch(`${backend!.baseUrl}${path}`, {
      method,
      headers:
        body === undefined
          ? authorization
          : { ...authorization, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

  it('persists a complete board and moves cards atomically across a restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const workspace = WorkspaceSchema.parse(
      await (await request('/api/v1/todo/workspaces', 'POST', { name: 'Live' })).json(),
    )
    await request('/api/v1/todo/workspaces/select', 'POST', { workspaceId: workspace.id })
    const backlog = TodoColumnSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${workspace.id}/columns`, 'POST', {
          name: 'Backlog',
        })
      ).json(),
    )
    const done = TodoColumnSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${workspace.id}/columns`, 'POST', {
          color: '#22aa66',
          name: 'Feito',
        })
      ).json(),
    )
    const card = TodoCardSchema.parse(
      await (
        await request(`/api/v1/todo/columns/${backlog.id}/cards`, 'POST', {
          description: 'Descrição',
          notes: 'Notas',
          title: 'Preparar live',
        })
      ).json(),
    )
    const secondCard = TodoCardSchema.parse(
      await (
        await request(`/api/v1/todo/columns/${backlog.id}/cards`, 'POST', {
          title: 'Segundo',
        })
      ).json(),
    )
    expect(
      TodoCardSchema.parse(
        await (
          await request(`/api/v1/todo/cards/${secondCard.id}/move`, 'POST', {
            columnId: backlog.id,
            position: 0,
          })
        ).json(),
      ).position,
    ).toBe(0)
    const moved = TodoCardSchema.parse(
      await (
        await request(`/api/v1/todo/cards/${card.id}/move`, 'POST', {
          columnId: done.id,
          position: 0,
        })
      ).json(),
    )
    expect(moved.columnId).toBe(done.id)
    await backend.close()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const board = TodoBoardSchema.parse(
      await (await request(`/api/v1/todo/workspaces/${workspace.id}`)).json(),
    )
    expect(board.cards).toHaveLength(2)
    expect(board.cards.find((item) => item.id === moved.id)).toEqual(moved)
    expect(board.cards.find((item) => item.id === secondCard.id)?.columnId).toBe(backlog.id)
    expect(board.columns).toHaveLength(2)
    const list = (await (await request('/api/v1/todo/workspaces')).json()) as { selectedId: string }
    expect(list.selectedId).toBe(workspace.id)
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })

  it('requires an explicit card strategy and cascades workspace deletion', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const workspace = WorkspaceSchema.parse(
      await (await request('/api/v1/todo/workspaces', 'POST', { name: 'Board' })).json(),
    )
    const source = TodoColumnSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${workspace.id}/columns`, 'POST', { name: 'A' })
      ).json(),
    )
    const target = TodoColumnSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${workspace.id}/columns`, 'POST', { name: 'B' })
      ).json(),
    )
    await request(`/api/v1/todo/columns/${source.id}/cards`, 'POST', { title: 'Mover' })
    expect((await request(`/api/v1/todo/columns/${source.id}/delete`, 'POST', {})).status).toBe(400)
    expect(
      (
        await request(`/api/v1/todo/columns/${source.id}/delete`, 'POST', {
          strategy: 'move',
          targetColumnId: target.id,
        })
      ).status,
    ).toBe(204)
    expect(
      TodoBoardSchema.parse(await (await request(`/api/v1/todo/workspaces/${workspace.id}`)).json())
        .cards[0]?.columnId,
    ).toBe(target.id)
    expect((await request(`/api/v1/todo/workspaces/${workspace.id}`, 'DELETE')).status).toBe(204)
    expect((await request(`/api/v1/todo/workspaces/${workspace.id}`)).status).toBe(404)
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })
})
