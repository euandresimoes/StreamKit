import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'

import Database from 'better-sqlite3'

export const AUTOMATIC_BACKUP_RETENTION = 5

export async function createDatabaseBackup(
  databasePath: string,
  backupDirectory: string,
  label: string,
): Promise<string> {
  await mkdir(backupDirectory, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const backupPath = join(
    backupDirectory,
    `${basename(databasePath)}.${stamp}.${randomUUID()}.${label}.backup`,
  )
  await copyFile(databasePath, backupPath)
  await pruneAutomaticBackups(backupDirectory, basename(databasePath))
  return backupPath
}

async function pruneAutomaticBackups(directory: string, databaseName: string): Promise<void> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith(`${databaseName}.`) &&
        entry.name.endsWith('.backup'),
    )
    .map((entry) => entry.name)
    .sort()
  const obsolete = entries.slice(0, Math.max(0, entries.length - AUTOMATIC_BACKUP_RETENTION))
  await Promise.all(obsolete.map((name) => rm(join(directory, name))))
}

export async function restoreDatabaseBackup(
  backupPath: string,
  destinationPath: string,
): Promise<void> {
  if (extname(backupPath) !== '.backup') throw new Error('Invalid StreamKit backup file')
  const backup = new Database(backupPath, { fileMustExist: true, readonly: true })
  try {
    if (backup.pragma('quick_check', { simple: true }) !== 'ok') {
      throw new Error('StreamKit backup failed its integrity check')
    }
  } finally {
    backup.close()
  }
  await mkdir(dirname(destinationPath), { recursive: true })
  await copyFile(backupPath, destinationPath, constants.COPYFILE_EXCL)
}
