import { EventEmitter } from 'node:events'

jest.mock('electron-updater', () => ({
  autoUpdater: Object.assign(new EventEmitter(), {
    allowPrerelease: false,
    autoDownload: true,
    channel: 'stable',
    checkForUpdates: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn(),
  }),
}))

import { autoUpdater } from 'electron-updater'

import { UpdateManager } from '../src/main/update-manager'

const updater = autoUpdater as typeof autoUpdater & EventEmitter

describe('UpdateManager', () => {
  beforeEach(() => {
    updater.removeAllListeners()
    jest.clearAllMocks()
  })

  it('presents an available update and hides the skipped version', async () => {
    const manager = new UpdateManager(() => undefined, 'stable')

    updater.emit('update-available', {
      releaseName: 'Release confiável',
      releaseNotes: 'Correções importantes.',
      version: '1.2.0',
    })
    expect(manager.snapshot()).toMatchObject({
      available: { title: 'Release confiável', version: '1.2.0' },
      status: 'available',
    })

    await manager.command({ action: 'skip', version: '1.2.0' })
    updater.emit('update-available', { version: '1.2.0' })
    expect(manager.snapshot()).toMatchObject({ available: null, status: 'up-to-date' })
  })

  it('keeps the app usable when an update check fails', async () => {
    const checkForUpdates = updater.checkForUpdates as jest.Mock
    checkForUpdates.mockRejectedValueOnce(new Error('network unavailable'))
    const manager = new UpdateManager(() => undefined, 'beta')

    await expect(manager.command({ action: 'check', manual: true })).resolves.toMatchObject({
      error: 'network unavailable',
      status: 'error',
    })
  })

  it('requires confirmation before installing during an active operation', async () => {
    const manager = new UpdateManager(() => undefined, 'stable')
    manager.setActivity(true)

    await expect(manager.command({ action: 'install' })).rejects.toThrow(
      'ACTIVE_OPERATION_CONFIRMATION_REQUIRED',
    )
    expect(updater.quitAndInstall).not.toHaveBeenCalled()
  })
})
