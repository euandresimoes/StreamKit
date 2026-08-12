import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

describe('desktop E2E harness', () => {
  it('never points at the real StreamKit user data directory', async () => {
    const environment = await createIsolatedTestEnvironment()

    expect(environment.userDataPath).toContain('streamkit-test-')
    expect(environment.databasePath).toContain('streamkit.test.db')

    await environment.cleanup()
  })
})
