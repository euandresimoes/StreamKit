import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type IsolatedTestEnvironment = {
  cleanup: () => Promise<void>
  databasePath: string
  userDataPath: string
}

export async function createIsolatedTestEnvironment(): Promise<IsolatedTestEnvironment> {
  const userDataPath = await mkdtemp(join(tmpdir(), 'streamlet-test-'))
  const databasePath = join(userDataPath, 'data', 'streamlet.test.db')

  return {
    cleanup: async () => rm(userDataPath, { force: true, recursive: true }),
    databasePath,
    userDataPath,
  }
}
