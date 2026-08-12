import { access } from 'node:fs/promises'

import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { ensureUserDataDirectories } from '../src/main/user-data-directories'

describe('StreamKit user data directories', () => {
  it('creates persistent application directories below the supplied Electron userData path', async () => {
    const environment = await createIsolatedTestEnvironment()
    const directories = await ensureUserDataDirectories(environment.userDataPath)

    await Promise.all(
      [directories.data, directories.logs, directories.backups, directories.cache].map((path) =>
        expect(access(path)).resolves.toBeUndefined(),
      ),
    )
    expect(directories.database).toBe(`${directories.data}\\streamkit.db`)
    await environment.cleanup()
  })
})
