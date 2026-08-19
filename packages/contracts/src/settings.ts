import { z } from 'zod'

export const ThemePreferenceSchema = z.enum(['dark', 'light', 'system'])
export const UpdatePreferenceSchema = z.enum(['automatic', 'notify', 'manual'])
export const LocaleSchema = z.enum(['en-US', 'pt-BR', 'es'])
export const AppSettingsSchema = z.object({
  confirmExitDuringActive: z.boolean(),
  debugEnabled: z.boolean(),
  minimizeToTray: z.boolean(),
  openAtLogin: z.boolean(),
  reduceMotion: z.boolean(),
  locale: LocaleSchema.default('en-US'),
  theme: ThemePreferenceSchema,
  updatePreference: UpdatePreferenceSchema,
  updatedAt: z.iso.datetime(),
})
export const UpdateAppSettingsRequestSchema = AppSettingsSchema.omit({ updatedAt: true })
export const SaveCredentialRequestSchema = z.object({
  credential: z.string().trim().min(1).max(4096),
})
export const CredentialStatusSchema = z.object({
  available: z.boolean(),
  configured: z.boolean(),
  provider: z.string().min(1),
})
export const DiagnosticInfoSchema = z.object({
  backendVersion: z.string(),
  databaseSchemaVersion: z.number().int().nonnegative(),
  debugEnabled: z.boolean(),
  logLines: z.array(z.string()),
  requestId: z.string(),
})
export type AppSettings = z.infer<typeof AppSettingsSchema>
export type UpdateAppSettingsRequest = z.infer<typeof UpdateAppSettingsRequestSchema>
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>
export type DiagnosticInfo = z.infer<typeof DiagnosticInfoSchema>
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>
export type Locale = z.infer<typeof LocaleSchema>
