import { Injectable } from '@nestjs/common'
import { KickIntegrationSupportSchema } from '@streamkit/contracts'

@Injectable()
export class KickSupportService {
  public status() {
    return KickIntegrationSupportSchema.parse({
      available: false,
      capabilities: [],
      limitations: [
        'A API oficial exige client_secret na troca e renovação OAuth; um segredo de aplicativo não pode ser distribuído com segurança no desktop.',
        'A leitura oficial de chat.message.sent exige um webhook público HTTPS; o StreamKit local não expõe um servidor público.',
        'Nenhum endpoint privado, reverso ou WebSocket não documentado será utilizado.',
      ],
      provider: 'kick',
      verifiedAt: '2026-08-13',
    })
  }
}
