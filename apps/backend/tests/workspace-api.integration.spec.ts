import { access } from 'node:fs/promises'

import {
  ApiErrorSchema,
  HealthResponseSchema,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { type LocalBackendHandle, startLocalBackend } from '../src/main'

const token = 'a'.repeat(64)

function authenticatedHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }
}

describe('workspace API vertical slice', () => {
  let backend: LocalBackendHandle | undefined

  afterEach(async () => {
    await backend?.close()
    backend = undefined
  })

  it('protects health and returns a stable error contract', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })

    const unauthorized = await fetch(`${backend.baseUrl}/api/v1/health`)
    expect(unauthorized.status).toBe(401)
    expect(ApiErrorSchema.parse(await unauthorized.json()).error.code).toBe('HTTP_401')

    const authorized = await fetch(`${backend.baseUrl}/api/v1/health`, {
      headers: authenticatedHeaders(),
    })
    expect(authorized.status).toBe(200)
    expect(HealthResponseSchema.parse(await authorized.json()).status).toBe('ok')

    await backend.close()
    backend = undefined
    await environment.cleanup()
    await expect(access(environment.userDataPath)).rejects.toBeDefined()
  })

  it('creates, persists and lists a workspace after a backend restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })

    const createdResponse = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      body: JSON.stringify({ description: 'Filmes da comunidade', name: 'Filmes' }),
      headers: authenticatedHeaders(),
      method: 'POST',
    })
    expect(createdResponse.status).toBe(201)
    const created = WorkspaceSchema.parse(await createdResponse.json())
    expect(created.name).toBe('Filmes')

    await backend.close()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })

    const listResponse = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      headers: authenticatedHeaders(),
    })
    const list = WorkspaceListResponseSchema.parse(await listResponse.json())
    expect(list.items).toEqual([created])

    await backend.close()
    backend = undefined
    await environment.cleanup()
  })

  it('rejects invalid workspace input without writing it', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })

    const invalid = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      body: JSON.stringify({ name: '   ' }),
      headers: authenticatedHeaders(),
      method: 'POST',
    })
    expect(invalid.status).toBe(400)
    expect(ApiErrorSchema.parse(await invalid.json()).error.code).toBe('VALIDATION_FAILED')

    const listResponse = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      headers: authenticatedHeaders(),
    })
    expect(WorkspaceListResponseSchema.parse(await listResponse.json()).items).toEqual([])

    await backend.close()
    backend = undefined
    await environment.cleanup()
  })
})
