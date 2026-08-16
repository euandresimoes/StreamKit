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
  public twitchClientIdStatus() {
    return this.credentials.status('twitch.client-id')
  }
  public youtubeClientIdStatus() {
    return this.credentials.status('youtube.client-id')
  }
  public kickClientIdStatus() {
    return this.credentials.status('kick.client-id')
  }
  public kickClientSecretStatus() {
    return this.credentials.status('kick.client-secret')
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

  public async saveProviderClientId(
    name: 'twitch.client-id' | 'youtube.client-id' | 'kick.client-id',
    value: string,
  ) {
    try {
      await this.credentials.save(name, value)
      return this.credentials.status(name)
    } catch {
      throw new ApiApplicationError(
        'SECURE_STORAGE_UNAVAILABLE',
        'Secure credential storage is unavailable',
        503,
      )
    }
  }

  public async saveKickClientId(value: string) {
    return this.saveProviderClientId('kick.client-id', value)
  }
  public async saveKickClientSecret(value: string) {
    try {
      await this.credentials.save('kick.client-secret', value)
      return this.credentials.status('kick.client-secret')
    } catch {
      throw new ApiApplicationError(
        'SECURE_STORAGE_UNAVAILABLE',
        'Secure credential storage is unavailable',
        503,
      )
    }
  }
}
