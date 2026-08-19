import Database from 'better-sqlite3'
import {
  AppSettingsSchema,
  CredentialStatusSchema,
  DiagnosticInfoSchema,
} from '@streamlet/contracts'
import { createIsolatedTestEnvironment } from '@streamlet/test-utils'
import {
  type LocalBackendHandle,
  type SecureCredentialRepository,
  type SecureCredentialStatus,
  startLocalBackend,
} from '../src/main'

class MockSecureCredentials implements SecureCredentialRepository {
  private configured = false
  public savedValue: string | null = null
  public async read() {
    return this.savedValue
  }
  public async remove() {
    this.configured = false
    this.savedValue = null
  }
  public async save(_name: string, value: string) {
    this.configured = true
    this.savedValue = value
  }
  public async status(): Promise<SecureCredentialStatus> {
    return { available: true, configured: this.configured, provider: 'mock-vault' }
  }
}

describe('Settings API security', () => {
  let backend: LocalBackendHandle | undefined
  afterEach(async () => {
    await backend?.close()
    backend = undefined
  })
  it('persists preferences while keeping the LivePix credential outside SQLite and responses', async () => {
    const environment = await createIsolatedTestEnvironment(),
      credentials = new MockSecureCredentials(),
      token = 'e'.repeat(64),
      auth = { authorization: `Bearer ${token}` }
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
      logPath: `${environment.userDataPath}/streamlet.log`,
      secureCredentialRepository: credentials,
    })
    const call = (path: string, method = 'GET', body?: unknown) =>
      fetch(`${backend!.baseUrl}${path}`, {
        method,
        headers: body === undefined ? auth : { ...auth, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    const settings = AppSettingsSchema.parse(
      await (
        await call('/api/v1/settings', 'PUT', {
          confirmExitDuringActive: false,
          debugEnabled: true,
          minimizeToTray: true,
          openAtLogin: true,
          reduceMotion: true,
          theme: 'dark',
          updatePreference: 'manual',
        })
      ).json(),
    )
    expect(settings.theme).toBe('dark')
    const secret = 'livepix-super-secret'
    const status = CredentialStatusSchema.parse(
      await (
        await call('/api/v1/settings/credentials/livepix', 'PUT', { credential: secret })
      ).json(),
    )
    expect(status).toEqual({ available: true, configured: true, provider: 'mock-vault' })
    expect(JSON.stringify(status)).not.toContain(secret)
    expect(credentials.savedValue).toBe(secret)
    const diagnostics = DiagnosticInfoSchema.parse(
      await (await call('/api/v1/system/diagnostics')).json(),
    )
    expect(diagnostics.logLines.join('\n')).not.toContain(secret)
    await backend.close()
    backend = undefined
    const raw = new Database(environment.databasePath, { readonly: true })
    expect(JSON.stringify(raw.prepare('SELECT * FROM app_settings').all())).not.toContain(secret)
    raw.close()
    await environment.cleanup()
  })
  it('reports an unavailable vault without accepting a secret', async () => {
    const environment = await createIsolatedTestEnvironment(),
      token = 'f'.repeat(64),
      auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    expect(
      CredentialStatusSchema.parse(
        await (
          await fetch(`${backend.baseUrl}/api/v1/settings/credentials/livepix`, { headers: auth })
        ).json(),
      ).available,
    ).toBe(false)
    expect(
      (
        await fetch(`${backend.baseUrl}/api/v1/settings/credentials/livepix`, {
          body: JSON.stringify({ credential: 'secret' }),
          headers: auth,
          method: 'PUT',
        })
      ).status,
    ).toBe(503)
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })
})
