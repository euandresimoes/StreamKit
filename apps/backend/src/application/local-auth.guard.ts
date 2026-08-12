import { timingSafeEqual } from 'node:crypto'

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

@Injectable()
export class LocalAuthGuard implements CanActivate {
  public constructor(private readonly expectedToken: string) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const header = request.headers.authorization
    const receivedToken = header?.startsWith('Bearer ') ? header.slice(7) : ''

    if (!this.tokensMatch(receivedToken)) {
      throw new UnauthorizedException('Invalid local API credentials')
    }

    return true
  }

  private tokensMatch(receivedToken: string): boolean {
    const expected = Buffer.from(this.expectedToken)
    const received = Buffer.from(receivedToken)

    return expected.length === received.length && timingSafeEqual(expected, received)
  }
}
