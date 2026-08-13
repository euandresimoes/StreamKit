import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SecureCredentialRepository, SecureCredentialStatus } from '@streamkit/backend'
import { safeStorage } from 'electron'

export class ElectronSecureCredentialRepository implements SecureCredentialRepository {
  public constructor(private readonly credentialDirectory: string) {}
  public async read(name: string): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage unavailable')
    try {
      return safeStorage.decryptString(await readFile(this.pathFor(name)))
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) return null
      throw error
    }
  }
  public async status(name: string): Promise<SecureCredentialStatus> {
    let configured = false
    try {
      await access(this.pathFor(name))
      configured = true
    } catch {
      configured = false
    }
    return {
      available: safeStorage.isEncryptionAvailable(),
      configured,
      provider: process.platform === 'win32' ? 'windows-dpapi' : 'electron-safe-storage',
    }
  }
  public async save(name: string, value: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage unavailable')
    const credentialPath = this.pathFor(name)
    await mkdir(this.credentialDirectory, { recursive: true })
    const temporaryPath = `${credentialPath}.tmp`
    const previousPath = `${credentialPath}.previous`
    await writeFile(temporaryPath, safeStorage.encryptString(value), { mode: 0o600 })
    await rm(previousPath, { force: true })
    try {
      await rename(credentialPath, previousPath)
    } catch (error) {
      if (!hasErrorCode(error, 'ENOENT')) throw error
    }
    try {
      await rename(temporaryPath, credentialPath)
      await rm(previousPath, { force: true })
    } catch (error) {
      try {
        await rename(previousPath, credentialPath)
      } catch {
        // The original error remains the actionable failure.
      }
      throw error
    }
  }
  public async remove(name: string): Promise<void> {
    await rm(this.pathFor(name), { force: true })
  }

  private pathFor(name: string): string {
    if (!/^[a-z0-9.-]{1,64}$/.test(name)) throw new Error('Invalid credential name')
    return join(this.credentialDirectory, `${name}.credential`)
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}
