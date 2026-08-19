import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export type StreamletUserDataDirectories = {
  backups: string
  cache: string
  data: string
  database: string
  logs: string
  root: string
}

export async function ensureUserDataDirectories(
  root: string,
): Promise<StreamletUserDataDirectories> {
  const directories = {
    backups: join(root, 'backups'),
    cache: join(root, 'cache'),
    data: join(root, 'data'),
    database: join(root, 'data', 'streamlet.db'),
    logs: join(root, 'logs'),
    root,
  }
  await Promise.all(
    [directories.data, directories.logs, directories.backups, directories.cache].map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  )
  return directories
}
