import { readFile, rename, writeFile } from 'node:fs/promises'

import type { Rectangle } from 'electron'
import { z } from 'zod'

const WindowBoundsSchema = z.object({
  height: z.number().int().min(240),
  width: z.number().int().min(360),
  x: z.number().int(),
  y: z.number().int(),
})

export type WindowBounds = z.infer<typeof WindowBoundsSchema>

export class WindowStateRepository {
  public constructor(private readonly statePath: string) {}

  public async load(): Promise<WindowBounds | null> {
    try {
      return WindowBoundsSchema.parse(JSON.parse(await readFile(this.statePath, 'utf8')))
    } catch {
      return null
    }
  }

  public async save(bounds: Rectangle): Promise<void> {
    const value = WindowBoundsSchema.parse(bounds)
    const temporaryPath = `${this.statePath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 })
    await rename(temporaryPath, this.statePath)
  }
}
