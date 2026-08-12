import { access } from 'node:fs/promises'

import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

describe('backend test isolation', () => {
  it('uses a disposable user data directory and database path', async () => {
    const environment = await createIsolatedTestEnvironment()

    expect(environment.databasePath).not.toContain('StreamKit\\data')

    await environment.cleanup()
    await expect(access(environment.userDataPath)).rejects.toBeDefined()
  })
})
