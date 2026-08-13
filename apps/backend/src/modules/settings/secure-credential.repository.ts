export type SecureCredentialStatus = { available: boolean; configured: boolean; provider: string }

export interface SecureCredentialRepository {
  read(name: string): Promise<string | null>
  remove(name: string): Promise<void>
  save(name: string, value: string): Promise<void>
  status(name: string): Promise<SecureCredentialStatus>
}

export const SECURE_CREDENTIAL_REPOSITORY = Symbol('SECURE_CREDENTIAL_REPOSITORY')

export class UnavailableSecureCredentialRepository implements SecureCredentialRepository {
  public async read(): Promise<string | null> {
    throw new Error('Secure storage unavailable')
  }
  public async remove(): Promise<void> {
    throw new Error('Secure storage unavailable')
  }
  public async save(): Promise<void> {
    throw new Error('Secure storage unavailable')
  }
  public async status(): Promise<SecureCredentialStatus> {
    return { available: false, configured: false, provider: 'unavailable' }
  }
}
