jest.mock('electron', () => ({
  safeStorage: {
    decryptString: (value: Buffer) => value.toString('utf8').replace(/^encrypted:/, ''),
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`, 'utf8'),
    isEncryptionAvailable: () => true,
  },
}))

import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { ElectronSecureCredentialRepository } from '../src/main/electron-secure-credential.repository'

describe('ElectronSecureCredentialRepository', () => {
  it('stores provider credentials independently and rejects unsafe names', async () => {
    const environment = await createIsolatedTestEnvironment()
    const repository = new ElectronSecureCredentialRepository(environment.userDataPath)

    await repository.save('twitch.oauth', 'twitch-secret')
    await repository.save('youtube.oauth', 'youtube-secret')
    expect(await repository.read('twitch.oauth')).toBe('twitch-secret')
    expect(await repository.read('youtube.oauth')).toBe('youtube-secret')
    await repository.remove('twitch.oauth')
    expect(await repository.read('twitch.oauth')).toBeNull()
    expect(await repository.read('youtube.oauth')).toBe('youtube-secret')
    await expect(repository.save('../outside', 'secret')).rejects.toThrow('Invalid credential name')

    await environment.cleanup()
  })
})
