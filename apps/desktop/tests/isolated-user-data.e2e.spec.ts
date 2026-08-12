import { createIsolatedTestEnvironment } from '@streamkit/test-utils'
import { WorkspaceListResponseSchema, WorkspaceSchema } from '@streamkit/contracts'
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
})
