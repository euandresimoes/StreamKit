import { randomUUID } from 'node:crypto'

import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { AddressInfo } from 'node:net'

import { ApiExceptionFilter } from '../application/api-exception.filter'
import { LocalAuthGuard } from '../application/local-auth.guard'
import { SqliteDatabase } from '../infrastructure/database/sqlite-database'
import { AppModule } from './app.module'

export type StartLocalBackendOptions = {
  authenticationToken: string
  backupDirectory?: string
  databasePath: string
  enableDocumentation?: boolean
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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(database),
    adapter,
    {
      abortOnError: false,
      logger: false,
    },
  )

  app.useGlobalFilters(new ApiExceptionFilter())
  app.useGlobalGuards(new LocalAuthGuard(options.authenticationToken))
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
  const address = app.getHttpServer().address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await app.close()
      database.close()
    },
  }
}
