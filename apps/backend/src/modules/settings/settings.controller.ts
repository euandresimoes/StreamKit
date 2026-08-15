import { Body, Controller, Delete, Get, Inject, Put } from '@nestjs/common'
import { SaveCredentialRequestSchema, UpdateAppSettingsRequestSchema } from '@streamkit/contracts'
import { SettingsService } from './settings.service'

@Controller('api/v1/settings')
export class SettingsController {
  public constructor(@Inject(SettingsService) private readonly service: SettingsService) {}
  @Get() public get() {
    return this.service.get()
  }
  @Put() public update(@Body() body: unknown) {
    return this.service.update(UpdateAppSettingsRequestSchema.parse(body))
  }
  @Get('credentials/livepix') public credentialStatus() {
    return this.service.credentialStatus()
  }
  @Put('credentials/livepix') public saveCredential(@Body() body: unknown) {
    return this.service.saveCredential(SaveCredentialRequestSchema.parse(body).credential)
  }
  @Delete('credentials/livepix') public removeCredential() {
    return this.service.removeCredential()
  }
  @Get('credentials/youtube-client-secret') public youtubeClientSecretStatus() {
    return this.service.youtubeClientSecretStatus()
  }
  @Put('credentials/youtube-client-secret') public saveYouTubeClientSecret(@Body() body: unknown) {
    return this.service.saveYouTubeClientSecret(SaveCredentialRequestSchema.parse(body).credential)
  }
}
