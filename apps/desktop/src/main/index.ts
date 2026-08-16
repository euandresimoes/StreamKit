import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import { RenderWindowManager } from '@renderizer/vue/electron'
import { type LocalBackendHandle, startLocalBackend } from '@streamkit/backend'
import { STREAMKIT_APP_ID, STREAMKIT_APP_NAME } from '@streamkit/config'
import {
  type BackendConnection,
  BackendConnectionSchema,
  type UpdateAppSettingsRequest,
} from '@streamkit/contracts'
import {
  app,
  BrowserWindow,
  Menu,
  nativeImage,
  nativeTheme,
  powerMonitor,
  session,
  shell,
  Tray,
} from 'electron'
import { z } from 'zod'

import { registerNativeIpcHandlers, removeNativeIpcHandlers } from './ipc'
import { createSecureWebPreferences, isAllowedExternalUrl } from './security-policy'
import { WindowStateRepository } from './window-state.repository'
import { UpdateManager } from './update-manager'
import { ensureUserDataDirectories } from './user-data-directories'
import { ElectronSecureCredentialRepository } from './electron-secure-credential.repository'

export const DESKTOP_RUNTIME = 'electron' as const

let backend: LocalBackendHandle | undefined
let mainWindow: BrowserWindow | undefined
let renderWindows: RenderWindowManager | undefined
let tray: Tray | undefined
let logsDirectory = ''
let isQuitting = false
let updateManager: UpdateManager | undefined
let desktopSettings: UpdateAppSettingsRequest = {
  confirmExitDuringActive: true,
  debugEnabled: false,
  minimizeToTray: false,
  openAtLogin: false,
  reduceMotion: false,
  theme: 'system',
  updatePreference: 'notify',
}

const LocalRendererUrlSchema = z
  .string()
  .url()
  .transform((value) => new URL(value))
  .refine(
    (value) => value.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(value.hostname),
    'Renderer URL must use HTTP loopback',
  )

function getAppAssetPath(fileName: string): string {
  const basePath = app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')
  return join(basePath, 'icons', fileName)
}

function applyDesktopSettings(settings: UpdateAppSettingsRequest): void {
  desktopSettings = settings
  if (process.platform !== 'darwin' && mainWindow) {
    const light =
      settings.theme === 'light' ||
      (settings.theme === 'system' && !nativeTheme.shouldUseDarkColors)
    mainWindow.setTitleBarOverlay({
      color: '#00000000',
      height: 40,
      symbolColor: light ? '#292725' : '#f1efeb',
    })
  }
  app.setLoginItemSettings({ openAtLogin: settings.openAtLogin })
  if (settings.minimizeToTray && !tray) {
    const icon = nativeImage.createFromPath(
      getAppAssetPath(process.platform === 'win32' ? 'windows.ico' : 'linux.png'),
    )
    tray = new Tray(icon)
    tray.setToolTip(STREAMKIT_APP_NAME)
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: 'Abrir StreamKit',
          click: () => {
            mainWindow?.show()
            mainWindow?.focus()
          },
        },
        {
          label: 'Sair',
          click: () => {
            isQuitting = true
            app.quit()
          },
        },
      ]),
    )
  } else if (!settings.minimizeToTray) {
    tray?.destroy()
    tray = undefined
  }
}

async function createMainWindow(connection: BackendConnection): Promise<void> {
  const preloadPath = join(__dirname, '../preload/index.js')
  const settingsState = new WindowStateRepository(
    join(app.getPath('userData'), 'settings-window.json'),
  )
  const savedSettingsBounds = await settingsState.load()

  mainWindow = new BrowserWindow({
    backgroundColor: '#1f1e1d',
    height: 820,
    minHeight: 640,
    minWidth: 960,
    show: false,
    ...(process.platform === 'win32' || process.platform === 'linux'
      ? { icon: getAppAssetPath(process.platform === 'win32' ? 'windows.ico' : 'linux.png') }
      : {}),
    title: STREAMKIT_APP_NAME,
    titleBarOverlay:
      process.platform === 'darwin'
        ? true
        : {
            color: '#00000000',
            height: 40,
            symbolColor: '#f1efeb',
          },
    titleBarStyle: 'hidden',
    webPreferences: createSecureWebPreferences(preloadPath),
    width: 1280,
  })
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('streamkit:fullscreen-state', true)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('streamkit:fullscreen-state', false)
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
  updateManager = new UpdateManager(
    () => mainWindow,
    process.env.STREAMKIT_RELEASE_CHANNEL === 'beta' ? 'beta' : 'stable',
    join(app.getPath('userData'), 'update-state.json'),
  )
  registerNativeIpcHandlers(
    connection,
    renderWindows,
    {
      applySettings: applyDesktopSettings,
      openDevTools: () => mainWindow?.webContents.openDevTools({ mode: 'detach' }),
      openLogsDirectory: async () => {
        await shell.openPath(logsDirectory)
      },
    },
    updateManager,
  )

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
  mainWindow.once('ready-to-show', () => {
    globalThis.setTimeout(() => {
      void updateManager?.command({ action: 'check', manual: false })
    }, 1500)
  })
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
  mainWindow.on('close', (event) => {
    if (!isQuitting && desktopSettings.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (process.env.STREAMKIT_RENDERER_URL) {
    await mainWindow.loadURL(process.env.STREAMKIT_RENDERER_URL)
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function bootstrap(): Promise<void> {
  const directories = await ensureUserDataDirectories(app.getPath('userData'))
  logsDirectory = directories.logs
  const token = randomBytes(32).toString('hex')
  backend = await startLocalBackend({
    ...(process.env.STREAMKIT_RENDERER_URL
      ? {
          allowedOrigins: [LocalRendererUrlSchema.parse(process.env.STREAMKIT_RENDERER_URL).origin],
        }
      : {}),
    authenticationToken: token,
    backupDirectory: directories.backups,
    cloudflaredBinaryPath: join(
      directories.data,
      process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared',
    ),
    databasePath: directories.database,
    enableDocumentation:
      !app.isPackaged || process.env.STREAMKIT_DEBUG === 'true' || process.argv.includes('--debug'),
    secureCredentialRepository: new ElectronSecureCredentialRepository(directories.data),
    logPath: join(directories.logs, 'streamkit.log'),
    integrationConfig: {
      twitchClientId: process.env.STREAMKIT_TWITCH_CLIENT_ID?.trim() || null,
      youtubeClientId: process.env.STREAMKIT_YOUTUBE_CLIENT_ID?.trim() || null,
      youtubeClientSecret: process.env.STREAMKIT_YOUTUBE_CLIENT_SECRET?.trim() || null,
    },
  })
  const connection = BackendConnectionSchema.parse({ baseUrl: backend.baseUrl, token })

  powerMonitor.on('resume', () => {
    void fetch(`${connection.baseUrl}/api/v1/integrations/runtime/resume`, {
      headers: { authorization: `Bearer ${connection.token}` },
      method: 'POST',
    }).catch(() => undefined)
  })

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
  isQuitting = true
  removeNativeIpcHandlers()
  renderWindows?.closeAll()
})

app.on('window-all-closed', () => {
  void backend?.close().finally(() => {
    backend = undefined
    app.quit()
  })
})
