import { createPinia, setActivePinia } from 'pinia'

import { useTodoStore } from '../src/stores/todo.store'

const token = 'a'.repeat(64)
const workspace = {
  createdAt: '2026-08-12T00:00:00.000Z',
  description: null,
  id: '4b5f5940-f5ce-45da-bfd4-d853d51a04d1',
  name: 'Filmes',
  position: 0,
  updatedAt: '2026-08-12T00:00:00.000Z',
}

describe('useTodoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: jest.fn(),
      writable: true,
    })
    window.streamkit = {
      getBackendConnection: async () => ({ baseUrl: 'http://127.0.0.1:49152', token }),
      getPlatform: async () => 'win32',
    }
  })

  it('replaces cache with the persisted workspace list', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue({
      json: async () => ({ items: [workspace], selectedId: null }),
      ok: true,
    } as Response)
    const store = useTodoStore()

    await store.loadWorkspaces()

    expect(store.workspaces).toEqual([workspace])
    expect(store.loading).toBe(false)
  })

  it('adds a workspace only after the backend confirms it', async () => {
    jest
      .mocked(globalThis.fetch)
      .mockResolvedValueOnce({ json: async () => workspace, ok: true } as Response)
      .mockResolvedValueOnce({ json: async () => undefined, ok: true } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ cards: [], columns: [], workspace }),
        ok: true,
      } as Response)
    const store = useTodoStore()

    await store.createWorkspace({ name: 'Filmes' })

    expect(store.workspaces).toEqual([workspace])
  })
})
