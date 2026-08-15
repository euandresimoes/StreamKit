import { timingSafeEqual } from 'node:crypto'

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'

import { LOCAL_PUBLIC_METADATA } from './local-public.decorator'

@Injectable()
export class LocalAuthGuard implements CanActivate {
  public constructor(
    private readonly expectedToken: string,
    private readonly reflector = new Reflector(),
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(LOCAL_PUBLIC_METADATA, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true
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
