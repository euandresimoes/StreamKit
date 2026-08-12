import { z } from 'zod'

export const ErrorCodeSchema = z.enum([
  'DATABASE_BACKUP_FAILED',
  'DATABASE_INCOMPATIBLE',
  'DATABASE_MIGRATION_FAILED',
  'DATABASE_RESTORE_FAILED',
  'HTTP_400',
  'HTTP_401',
  'HTTP_404',
  'HTTP_409',
  'HTTP_500',
  'INTERNAL_ERROR',
  'VALIDATION_FAILED',
])

export type ErrorCode = z.infer<typeof ErrorCodeSchema>
