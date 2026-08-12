export type SecureCredentialStatus = { available: boolean; configured: boolean; provider: string }

export interface SecureCredentialRepository {
  remove(name: string): Promise<void>
  save(name: string, value: string): Promise<void>
  status(name: string): Promise<SecureCredentialStatus>
}

export const SECURE_CREDENTIAL_REPOSITORY = Symbol('SECURE_CREDENTIAL_REPOSITORY')

export class UnavailableSecureCredentialRepository implements SecureCredentialRepository {
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
