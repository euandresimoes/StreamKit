import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SecureCredentialRepository, SecureCredentialStatus } from '@streamkit/backend'
import { safeStorage } from 'electron'

export class ElectronSecureCredentialRepository implements SecureCredentialRepository {
  public constructor(private readonly credentialPath: string) {}
  public async status(): Promise<SecureCredentialStatus> {
    let configured = false
    try {
      await access(this.credentialPath)
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
  public async save(_name: string, value: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage unavailable')
    await mkdir(dirname(this.credentialPath), { recursive: true })
    const temporaryPath = `${this.credentialPath}.tmp`
    const previousPath = `${this.credentialPath}.previous`
    await writeFile(temporaryPath, safeStorage.encryptString(value), { mode: 0o600 })
    await rm(previousPath, { force: true })
    try {
      await rename(this.credentialPath, previousPath)
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
    try {
      await rename(temporaryPath, this.credentialPath)
      await rm(previousPath, { force: true })
    } catch (error) {
      try {
        await rename(previousPath, this.credentialPath)
      } catch {
        // The original error remains the actionable failure.
      }
      throw error
    }
  }
  public async remove(): Promise<void> {
    await rm(this.credentialPath, { force: true })
  }
}
