import { type BackendConnection, UpdateAppSettingsRequestSchema } from '@streamkit/contracts'
import type { RenderWindowManager } from '@renderizer/vue/electron'
import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'

const EmptyArgumentsSchema = z.tuple([])
const WindowIdSchema = z.string().regex(/^[a-z0-9][a-z0-9:_-]{0,127}$/)
const WindowActionSchema = z.enum(['minimize', 'toggle-maximize', 'close', 'focus'])

export function registerNativeIpcHandlers(
  connection: BackendConnection,
  renderWindows: RenderWindowManager,
  actions: {
    applySettings: (settings: ReturnType<typeof UpdateAppSettingsRequestSchema.parse>) => void
    openDevTools: () => void
    openLogsDirectory: () => Promise<void>
  },
): void {
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
    'streamkit:get-backend-connection',
    'streamkit:get-platform',
    'streamkit:apply-settings',
    'streamkit:open-devtools',
    'streamkit:open-logs-directory',
    'renderizer-window-ready',
    'renderizer-window-control',
    'renderizer-window-state',
  ]) {
    ipcMain.removeHandler(channel)
  }
}
