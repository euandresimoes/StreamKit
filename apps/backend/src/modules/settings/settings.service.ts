import { Inject, Injectable } from '@nestjs/common'
import type { UpdateAppSettingsRequest } from '@streamkit/contracts'
import { ApiApplicationError } from '../../application/api-error'
import {
  SECURE_CREDENTIAL_REPOSITORY,
  type SecureCredentialRepository,
} from './secure-credential.repository'
import { SettingsRepository } from './settings.repository'

@Injectable()
export class SettingsService {
  public constructor(
    @Inject(SettingsRepository) private readonly settings: SettingsRepository,
    @Inject(SECURE_CREDENTIAL_REPOSITORY) private readonly credentials: SecureCredentialRepository,
  ) {}
  public get() {
    return this.settings.get()
  }
  public update(input: UpdateAppSettingsRequest) {
    return this.settings.update(input)
  }
  public credentialStatus() {
    return this.credentials.status('livepix')
  }
  public youtubeClientSecretStatus() {
    return this.credentials.status('youtube.client-secret')
  }
  public async saveCredential(value: string) {
    try {
      await this.credentials.save('livepix', value)
      return this.credentials.status('livepix')
    } catch {
      throw new ApiApplicationError(
        'SECURE_STORAGE_UNAVAILABLE',
        'Secure credential storage is unavailable',
        503,
      )
    }
  }
  public async removeCredential() {
    try {
      await this.credentials.remove('livepix')
      return this.credentials.status('livepix')
    } catch {
      throw new ApiApplicationError(
        'SECURE_STORAGE_UNAVAILABLE',
        'Secure credential storage is unavailable',
        503,
      )
    }
  }

  public async saveYouTubeClientSecret(value: string) {
    try {
      await this.credentials.save('youtube.client-secret', value)
      return this.credentials.status('youtube.client-secret')
    } catch {
      throw new ApiApplicationError(
        'SECURE_STORAGE_UNAVAILABLE',
        'Secure credential storage is unavailable',
        503,
      )
    }
  }
}
