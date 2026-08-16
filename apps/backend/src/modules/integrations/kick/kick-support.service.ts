import { Injectable } from '@nestjs/common'
import { KickIntegrationSupportSchema } from '@streamkit/contracts'

@Injectable()
export class KickSupportService {
  public status() {
    return KickIntegrationSupportSchema.parse({
      available: true,
      capabilities: [
        'chat.read',
        'chat.write',
        'chat.message.delete',
        'chat.user.ban',
        'chat.user.unban',
        'live.read',
        'user.identity',
      ],
      limitations: [
        'Kick requires the optional local HTTPS tunnel to deliver official webhook events.',
        'Pinning messages and moderator role changes are not available in the documented API.',
      ],
      provider: 'kick',
      verifiedAt: '2026-08-13',
    })
  }
}
