import {
  TodoBoardSchema,
  TodoCardSchema,
  TodoColumnSchema,
  TodoTemplateSchema,
  WorkspaceSchema,
} from '@streamlet/contracts'
import { createIsolatedTestEnvironment } from '@streamlet/test-utils'
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
    const fallbackWorkspace = WorkspaceSchema.parse(
      await (await request('/api/v1/todo/workspaces', 'POST', { name: 'Fallback' })).json(),
    )
    await request('/api/v1/todo/workspaces/select', 'POST', { workspaceId: workspace.id })
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
    const afterDeletion = (await (await request('/api/v1/todo/workspaces')).json()) as {
      selectedId: string | null
    }
    expect(afterDeletion.selectedId).toBe(fallbackWorkspace.id)
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })

  it('creates, lists, applies and deletes TODO templates', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const source = WorkspaceSchema.parse(
      await (await request('/api/v1/todo/workspaces', 'POST', { name: 'Source' })).json(),
    )
    const target = WorkspaceSchema.parse(
      await (await request('/api/v1/todo/workspaces', 'POST', { name: 'Target' })).json(),
    )
    const column = TodoColumnSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${source.id}/columns`, 'POST', {
          name: 'Live tasks',
        })
      ).json(),
    )
    await request(`/api/v1/todo/columns/${column.id}/cards`, 'POST', {
      description: 'Prepare the stream',
      priority: 'high',
      title: 'Go live',
    })

    const template = TodoTemplateSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${source.id}/templates`, 'POST', {
          description: 'Reusable live checklist',
          name: 'Live setup',
        })
      ).json(),
    )
    expect(template.structure.columns[0]?.cards[0]?.title).toBe('Go live')

    const listed = TodoTemplateSchema.array().parse(
      await (await request(`/api/v1/todo/workspaces/${target.id}/templates`)).json(),
    )
    expect(listed.map((item) => item.id)).toContain(template.id)

    const applied = TodoBoardSchema.parse(
      await (
        await request(`/api/v1/todo/workspaces/${target.id}/templates/${template.id}/apply`, 'POST')
      ).json(),
    )
    expect(applied.columns).toHaveLength(1)
    expect(applied.cards).toHaveLength(1)
    expect(applied.cards[0]?.title).toBe('Go live')

    expect((await request(`/api/v1/todo/templates/${template.id}`, 'DELETE')).status).toBe(204)
    expect(
      (await request(`/api/v1/todo/workspaces/${source.id}/templates`)).json(),
    ).resolves.toEqual([])
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })
})
