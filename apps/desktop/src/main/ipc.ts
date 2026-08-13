import {
  type BackendConnection,
  UpdateAppSettingsRequestSchema,
  UpdateCommandSchema,
} from '@streamkit/contracts'
import type { UpdateManager } from './update-manager'
import type { RenderWindowManager } from '@renderizer/vue/electron'
import { clipboard, ipcMain, type IpcMainInvokeEvent, shell } from 'electron'
import { z } from 'zod'

const EmptyArgumentsSchema = z.tuple([])
const WindowIdSchema = z.string().regex(/^[a-z0-9][a-z0-9:_-]{0,127}$/)
const WindowActionSchema = z.enum(['minimize', 'toggle-maximize', 'close', 'focus'])
const ClipboardTextSchema = z.string().max(512)
const ExternalUrlSchema = z.url().refine((value) => {
  const url = new URL(value)
  return (
    url.protocol === 'https:' &&
    ['accounts.google.com', 'id.kick.com', 'www.twitch.tv'].includes(url.hostname)
  )
}, 'External authentication URL is not allowed')

export function registerNativeIpcHandlers(
  connection: BackendConnection,
  renderWindows: RenderWindowManager,
  actions: {
    applySettings: (settings: ReturnType<typeof UpdateAppSettingsRequestSchema.parse>) => void
    openDevTools: () => void
    openLogsDirectory: () => Promise<void>
  },
  updates?: UpdateManager,
): void {
  ipcMain.handle('streamkit:copy-text', (_event, input: unknown, ...rest: unknown[]) => {
    EmptyArgumentsSchema.parse(rest)
    clipboard.writeText(ClipboardTextSchema.parse(input))
  })
  ipcMain.handle('streamkit:update-command', (_event, input: unknown, ...rest: unknown[]) => {
    EmptyArgumentsSchema.parse(rest)
    if (!updates) throw new Error('Updater unavailable')
    return updates.command(UpdateCommandSchema.parse(input))
  })
  ipcMain.handle('streamkit:update-state', (_event, ...rest: unknown[]) => {
    EmptyArgumentsSchema.parse(rest)
    return updates?.snapshot()
  })
  ipcMain.handle('streamkit:update-activity', (_event, active: unknown, ...rest: unknown[]) => {
    EmptyArgumentsSchema.parse(rest)
    updates?.setActivity(z.boolean().parse(active))
  })
  ipcMain.handle('streamkit:apply-settings', (_event, input: unknown, ...rest: unknown[]) => {
    EmptyArgumentsSchema.parse(rest)
    actions.applySettings(UpdateAppSettingsRequestSchema.parse(input))
  })
  ipcMain.handle('streamkit:open-devtools', (_event, ...arguments_: unknown[]) => {
    EmptyArgumentsSchema.parse(arguments_)
    actions.openDevTools()
  })
  ipcMain.handle('streamkit:open-logs-directory', async (_event, ...arguments_: unknown[]) => {
    EmptyArgumentsSchema.parse(arguments_)
    await actions.openLogsDirectory()
  })
  ipcMain.handle(
    'streamkit:open-external-auth',
    async (_event, input: unknown, ...rest: unknown[]) => {
      EmptyArgumentsSchema.parse(rest)
      await shell.openExternal(ExternalUrlSchema.parse(input))
    },
  )
  ipcMain.handle('streamkit:get-backend-connection', (_event, ...arguments_: unknown[]) => {
    EmptyArgumentsSchema.parse(arguments_)
    return connection
  })

  ipcMain.handle('streamkit:get-platform', (_event, ...arguments_: unknown[]) => {
    EmptyArgumentsSchema.parse(arguments_)
    return process.platform
  })

  ipcMain.handle(
    'renderizer-window-ready',
    (event: IpcMainInvokeEvent, windowIdInput: unknown, ...rest: unknown[]) => {
      EmptyArgumentsSchema.parse(rest)
      renderWindows.show(event, WindowIdSchema.parse(windowIdInput))
    },
  )

  ipcMain.handle(
    'renderizer-window-control',
    (
      event: IpcMainInvokeEvent,
      windowIdInput: unknown,
      actionInput: unknown,
      ...rest: unknown[]
    ) => {
      EmptyArgumentsSchema.parse(rest)
      renderWindows.control(
        event,
        WindowIdSchema.parse(windowIdInput),
        WindowActionSchema.parse(actionInput),
      )
    },
  )

  ipcMain.handle(
    'renderizer-window-state',
    (event: IpcMainInvokeEvent, windowIdInput: unknown, ...rest: unknown[]) => {
      EmptyArgumentsSchema.parse(rest)
      return renderWindows.getState(event, WindowIdSchema.parse(windowIdInput))
    },
  )
}

export function removeNativeIpcHandlers(): void {
  for (const channel of [
    'streamkit:copy-text',
    'streamkit:get-backend-connection',
    'streamkit:get-platform',
    'streamkit:apply-settings',
    'streamkit:open-devtools',
    'streamkit:open-logs-directory',
    'streamkit:open-external-auth',
    'streamkit:update-command',
    'streamkit:update-state',
    'streamkit:update-activity',
    'renderizer-window-ready',
    'renderizer-window-control',
    'renderizer-window-state',
  ]) {
    ipcMain.removeHandler(channel)
  }
}
