import { Inject, Injectable } from '@nestjs/common'
import { AppSettingsSchema, type UpdateAppSettingsRequest } from '@streamkit/contracts'
import { eq } from 'drizzle-orm'
import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import { appSettings } from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'
import { ApiApplicationError } from '../../application/api-error'

const SETTINGS_KEY = 'global.preferences'
const defaults: UpdateAppSettingsRequest = {
  confirmExitDuringActive: true,
  debugEnabled: false,
  minimizeToTray: false,
  openAtLogin: false,
  reduceMotion: false,
  theme: 'system',
  updatePreference: 'notify',
}

@Injectable()
export class SettingsRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}
  public async get() {
    const [row] = await this.database.orm
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEY))
    let value: UpdateAppSettingsRequest = defaults
    if (row) {
      let decoded: unknown
      try {
        decoded = JSON.parse(row.valueJson) as unknown
      } catch {
        throw new ApiApplicationError('DATABASE_INCOMPATIBLE', 'Stored settings are invalid', 500)
      }
      const parsed = AppSettingsSchema.omit({ updatedAt: true }).safeParse(decoded)
      if (!parsed.success)
        throw new ApiApplicationError('DATABASE_INCOMPATIBLE', 'Stored settings are invalid', 500)
      value = parsed.data
    }
    return AppSettingsSchema.parse({
      ...value,
      updatedAt: row?.updatedAt ?? new Date(0).toISOString(),
    })
  }
  public async update(input: UpdateAppSettingsRequest) {
    const updatedAt = new Date().toISOString(),
      valueJson = JSON.stringify(input)
    await this.database.orm
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, updatedAt, valueJson })
      .onConflictDoUpdate({ target: appSettings.key, set: { updatedAt, valueJson } })
    return AppSettingsSchema.parse({ ...input, updatedAt })
  }
}
