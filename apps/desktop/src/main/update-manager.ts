import type { UpdateCommand, UpdateState } from '@streamkit/contracts'
import type { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { readFile, writeFile } from 'node:fs/promises'

export class UpdateManager {
  private state: UpdateState
  private skippedVersion: string | null = null
  private activityActive = false
  public constructor(
    private readonly window: () => BrowserWindow | undefined,
    channel: 'stable' | 'beta',
    private readonly statePath?: string,
  ) {
    this.state = { available: null, channel, error: null, progress: null, status: 'idle' }
    autoUpdater.autoDownload = false
    autoUpdater.channel = channel
    autoUpdater.allowPrerelease = channel === 'beta'
    autoUpdater.on('update-available', (info) => {
      if (info.version === this.skippedVersion)
        return this.set({ available: null, status: 'up-to-date' })
      this.set({
        available: {
          changelog: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
          title: info.releaseName ?? `StreamKit ${info.version}`,
          version: info.version,
        },
        status: 'available',
      })
    })
    autoUpdater.on('update-not-available', () =>
      this.set({ available: null, status: 'up-to-date' }),
    )
    autoUpdater.on('download-progress', (progress) =>
      this.set({ progress: progress.percent, status: 'downloading' }),
    )
    autoUpdater.on('update-downloaded', () => this.set({ progress: 100, status: 'downloaded' }))
    autoUpdater.on('error', (error) => this.set({ error: error.message, status: 'error' }))
  }
  public snapshot(): UpdateState {
    return structuredClone(this.state)
  }
  public setActivity(active: boolean): void {
    this.activityActive = active
  }
  public async command(command: UpdateCommand): Promise<UpdateState> {
    if (command.action === 'skip') {
      this.skippedVersion = command.version
      if (this.statePath)
        await writeFile(this.statePath, JSON.stringify({ skippedVersion: command.version }), 'utf8')
      if (this.state.available?.version === command.version)
        this.set({ available: null, status: 'idle' })
      return this.snapshot()
    }
    if (command.action === 'check') {
      if (this.statePath) {
        try {
          this.skippedVersion =
            JSON.parse(await readFile(this.statePath, 'utf8')).skippedVersion ?? null
        } catch {
          this.skippedVersion = null
        }
      }
      this.set({ error: null, status: 'checking' })
      try {
        await autoUpdater.checkForUpdates()
      } catch (error) {
        this.set({
          error: error instanceof Error ? error.message : 'Update check failed',
          status: 'error',
        })
      }
      return this.snapshot()
    }
    if (command.action === 'download') {
      this.set({ error: null, progress: 0, status: 'downloading' })
      try {
        await autoUpdater.downloadUpdate()
      } catch (error) {
        this.set({
          error: error instanceof Error ? error.message : 'Update download failed',
          status: 'error',
        })
      }
      return this.snapshot()
    }
    if (this.activityActive) throw new Error('ACTIVE_OPERATION_CONFIRMATION_REQUIRED')
    autoUpdater.quitAndInstall(false, true)
    return this.snapshot()
  }
  private set(change: Partial<UpdateState>): void {
    this.state = { ...this.state, ...change }
    this.window()?.webContents.send('streamkit:update-state', this.state)
  }
}
