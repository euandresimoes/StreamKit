import { access } from 'node:fs/promises'

import {
  ApiErrorSchema,
  DatabaseStatusSchema,
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

  it('allows API preflight only for the configured local renderer origin', async () => {
    const environment = await createIsolatedTestEnvironment()
    const rendererOrigin = 'http://127.0.0.1:5173'
    backend = await startLocalBackend({
      allowedOrigins: [rendererOrigin],
      authenticationToken: token,
      databasePath: environment.databasePath,
    })

    const allowed = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      headers: {
        'access-control-request-headers': 'authorization,content-type',
        'access-control-request-method': 'PATCH',
        origin: rendererOrigin,
      },
      method: 'OPTIONS',
    })
    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('access-control-allow-origin')).toBe(rendererOrigin)
    expect(allowed.headers.get('access-control-allow-methods')).toContain('PATCH')
    expect(allowed.headers.get('access-control-allow-headers')).toContain('authorization')

    const rejected = await fetch(`${backend.baseUrl}/api/v1/todo/workspaces`, {
      headers: { 'access-control-request-method': 'POST', origin: 'https://attacker.example' },
      method: 'OPTIONS',
    })
    expect(rejected.headers.get('access-control-allow-origin')).toBeNull()

    await backend.close()
    backend = undefined
    await environment.cleanup()
  })

  it('exposes non-sensitive database infrastructure status', async () => {
    const environment = await createIsolatedTestEnvironment()
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const response = await fetch(`${backend.baseUrl}/api/v1/system/database`, {
      headers: authenticatedHeaders(),
    })
    expect(DatabaseStatusSchema.parse(await response.json())).toEqual({
      foreignKeys: true,
      journalMode: 'wal',
      schemaVersion: 17,
    })
    await backend.close()
    backend = undefined
    await environment.cleanup()
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
