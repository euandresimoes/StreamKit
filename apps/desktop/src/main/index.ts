import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import { RenderWindowManager } from '@renderizer/vue/electron'
import { type LocalBackendHandle, startLocalBackend } from '@streamkit/backend'
import { STREAMKIT_APP_ID, STREAMKIT_APP_NAME } from '@streamkit/config'
import { type BackendConnection, BackendConnectionSchema } from '@streamkit/contracts'
import { app, BrowserWindow, session, shell } from 'electron'

import { registerNativeIpcHandlers, removeNativeIpcHandlers } from './ipc'
import { createSecureWebPreferences, isAllowedExternalUrl } from './security-policy'
import { WindowStateRepository } from './window-state.repository'
import { ensureUserDataDirectories } from './user-data-directories'

export const DESKTOP_RUNTIME = 'electron' as const

let backend: LocalBackendHandle | undefined
let mainWindow: BrowserWindow | undefined
let renderWindows: RenderWindowManager | undefined

async function createMainWindow(connection: BackendConnection): Promise<void> {
  const preloadPath = join(__dirname, '../preload/index.js')
  const settingsState = new WindowStateRepository(
    join(app.getPath('userData'), 'settings-window.json'),
  )
  const savedSettingsBounds = await settingsState.load()

  mainWindow = new BrowserWindow({
    backgroundColor: '#0d0f13',
    height: 820,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: STREAMKIT_APP_NAME,
    webPreferences: createSecureWebPreferences(preloadPath),
    width: 1280,
  })

  renderWindows = new RenderWindowManager({
    appId: STREAMKIT_APP_ID,
    defaultWindowOptions: {
      ...(savedSettingsBounds ?? {}),
      webPreferences: createSecureWebPreferences(preloadPath),
    },
    openExternal: async (url) => {
      if (isAllowedExternalUrl(url)) await shell.openExternal(url)
    },
    preloadPath,
  })
  renderWindows.attachTo(mainWindow)
  registerNativeIpcHandlers(connection, renderWindows)

  mainWindow.webContents.on('did-create-window', (window, details) => {
    if (details.frameName !== 'renderizer:settings') return
    window.on('close', () => {
      void settingsState.save(window.getBounds())
    })
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault()
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  if (process.env.STREAMKIT_RENDERER_URL) {
    await mainWindow.loadURL(process.env.STREAMKIT_RENDERER_URL)
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function bootstrap(): Promise<void> {
  const directories = await ensureUserDataDirectories(app.getPath('userData'))
  const token = randomBytes(32).toString('hex')
  backend = await startLocalBackend({
    authenticationToken: token,
    backupDirectory: directories.backups,
    databasePath: directories.database,
    enableDocumentation: !app.isPackaged || process.env.STREAMKIT_DEBUG === 'true',
  })
  const connection = BackendConnectionSchema.parse({ baseUrl: backend.baseUrl, token })

  await createMainWindow(connection)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false)
    })
    await bootstrap()
  })
}

app.on('before-quit', () => {
  removeNativeIpcHandlers()
  renderWindows?.closeAll()
})

app.on('window-all-closed', () => {
  void backend?.close().finally(() => {
    backend = undefined
    app.quit()
  })
})
