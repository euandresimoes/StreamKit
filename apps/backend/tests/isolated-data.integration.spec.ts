import { access } from 'node:fs/promises'

import { createIsolatedTestEnvironment } from '@streamlet/test-utils'

describe('backend test isolation', () => {
  it('uses a disposable user data directory and database path', async () => {
    const environment = await createIsolatedTestEnvironment()

    expect(environment.databasePath).not.toContain('Streamlet\\data')

    await environment.cleanup()
    await expect(access(environment.userDataPath)).rejects.toBeDefined()
  })
})
