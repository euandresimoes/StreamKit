import { randomUUID } from 'node:crypto'

import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { AddressInfo } from 'node:net'

import { ApiExceptionFilter } from '../application/api-exception.filter'
import { LocalAuthGuard } from '../application/local-auth.guard'
import { SqliteDatabase } from '../infrastructure/database/sqlite-database'
import { AppModule } from './app.module'
import type { SecureCredentialRepository } from '../modules/settings/secure-credential.repository'
import {
  RotatingFileLogger,
  SilentStreamKitLogger,
  type StreamKitLogger,
} from '../infrastructure/logging/streamkit-logger'
import type { IntegrationRuntimeConfig } from '../modules/integrations/integration-runtime.config'
import { ExternalTransportService } from '../modules/integrations/external-events/external-transport.service'

export type StartLocalBackendOptions = {
  allowedOrigins?: readonly string[]
  authenticationToken: string
  backupDirectory?: string
  cloudflaredBinaryPath?: string
  databasePath: string
  enableDocumentation?: boolean
  secureCredentialRepository?: SecureCredentialRepository
  logPath?: string
  integrationConfig?: IntegrationRuntimeConfig
}

export type LocalBackendHandle = {
  baseUrl: string
  close: () => Promise<void>
}

export async function startLocalBackend(
  options: StartLocalBackendOptions,
): Promise<LocalBackendHandle> {
  const database = await SqliteDatabase.open(options.databasePath, {
    ...(options.backupDirectory ? { backupDirectory: options.backupDirectory } : {}),
  })
  const adapter = new FastifyAdapter({
    genReqId: () => randomUUID(),
    logger: false,
  })
  const logger: StreamKitLogger = options.logPath
    ? new RotatingFileLogger(options.logPath)
    : new SilentStreamKitLogger()
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(
      database,
      options.secureCredentialRepository,
      logger,
      options.integrationConfig,
      options.cloudflaredBinaryPath,
    ),
    adapter,
    {
      abortOnError: false,
      logger: false,
    },
  )

  app.useGlobalFilters(new ApiExceptionFilter(process.env.NODE_ENV !== 'production'))
  app.useGlobalGuards(new LocalAuthGuard(options.authenticationToken))
  if (options.allowedOrigins?.length) {
    app.enableCors({
      allowedHeaders: ['authorization', 'content-type'],
      methods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
      origin: [...options.allowedOrigins],
    })
  }
  const started = new WeakMap<object, number>()
  adapter.getInstance().addHook('onRequest', async (request) => {
    started.set(request, performance.now())
  })
  adapter.getInstance().addHook('onResponse', async (request, reply) => {
    await logger.log('info', 'http.request', {
      durationMs:
        Math.round((performance.now() - (started.get(request) ?? performance.now())) * 100) / 100,
      method: request.method,
      requestId: request.id,
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
    })
  })
  if (options.enableDocumentation) {
    const { apiReference } = await import('@scalar/nestjs-api-reference')
    const openApi = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('StreamKit Local API')
        .setDescription('Local-only API for the StreamKit desktop application.')
        .setVersion('0.0.0')
        .addBearerAuth()
        .build(),
    )
    app.use('/docs', apiReference({ content: openApi }))
  }

  await app.listen(0, '127.0.0.1')
  await logger.log('info', 'backend.started', {
    environment: process.env.NODE_ENV ?? 'development',
  })
  const address = app.getHttpServer().address() as AddressInfo
  app.get(ExternalTransportService).setLocalBaseUrl(`http://127.0.0.1:${address.port}`)

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await logger.log('info', 'backend.stopping')
      await app.close()
      database.close()
    },
  }
}
