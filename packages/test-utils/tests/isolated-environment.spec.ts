import { access } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { createIsolatedTestEnvironment } from '../src'

describe('createIsolatedTestEnvironment', () => {
  it('creates user data under the operating-system temp directory', async () => {
    const environment = await createIsolatedTestEnvironment()

    expect(environment.userDataPath.startsWith(tmpdir())).toBe(true)
    expect(environment.databasePath).toContain('streamlet.test.db')

    await environment.cleanup()
    await expect(access(environment.userDataPath)).rejects.toBeDefined()
  })
})
