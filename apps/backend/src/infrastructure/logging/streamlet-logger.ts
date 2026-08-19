import { appendFile, mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { dirname } from 'node:path'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
const sensitiveKey = /authorization|credential|password|secret|token|api[-_]?key/i

export function redactSensitive(value: unknown, key = ''): unknown {
  if (sensitiveKey.test(key)) return '[REDACTED]'
  if (typeof value === 'string')
    return value.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]')
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [
        childKey,
        redactSensitive(child, childKey),
      ]),
    )
  return value
}

export interface StreamletLogger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): Promise<void>
  recent(limit?: number): Promise<string[]>
}
export const STREAMLET_LOGGER = Symbol('STREAMLET_LOGGER')

export class SilentStreamletLogger implements StreamletLogger {
  public async log(): Promise<void> {}
  public async recent(): Promise<string[]> {
    return []
  }
}

export class RotatingFileLogger implements StreamletLogger {
  public constructor(
    private readonly path: string,
    private readonly maximumBytes = 2_000_000,
  ) {}
  public async log(
    level: LogLevel,
    message: string,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    await this.rotateIfNeeded()
    await appendFile(
      this.path,
      `${JSON.stringify({ context: redactSensitive(context), level, message, timestamp: new Date().toISOString() })}\n`,
      { encoding: 'utf8', mode: 0o600 },
    )
  }
  public async recent(limit = 200): Promise<string[]> {
    try {
      return (await readFile(this.path, 'utf8')).split(/\r?\n/).filter(Boolean).slice(-limit)
    } catch {
      return []
    }
  }
  private async rotateIfNeeded(): Promise<void> {
    try {
      if ((await stat(this.path)).size < this.maximumBytes) return
      await rm(`${this.path}.1`, { force: true })
      await rename(this.path, `${this.path}.1`)
    } catch {
      return
    }
  }
}
