import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createIsolatedTestEnvironment } from '@streamlet/test-utils'
import { redactSensitive, RotatingFileLogger } from '../src/infrastructure/logging/streamlet-logger'

describe('secure logging', () => {
  it('redacts tokens, authorization headers and sensitive payload fields', () => {
    expect(
      redactSensitive({
        authorization: 'Bearer secret-token',
        body: { credential: 'livepix-secret', name: 'safe' },
        message: 'using Bearer abc.def',
      }),
    ).toEqual({
      authorization: '[REDACTED]',
      body: { credential: '[REDACTED]', name: 'safe' },
      message: 'using Bearer [REDACTED]',
    })
  })
  it('rotates bounded JSON logs without persisting secrets', async () => {
    const environment = await createIsolatedTestEnvironment(),
      directory = join(environment.userDataPath, 'logs'),
      path = join(directory, 'streamlet.log')
    await mkdir(directory, { recursive: true })
    const logger = new RotatingFileLogger(path, 100)
    await logger.log('trace', 'first', { token: 'never-write-me' })
    await logger.log('debug', 'second', { authorization: 'Bearer hidden' })
    await logger.log('info', 'third')
    await logger.log('warn', 'fourth')
    await logger.log('error', 'fifth')
    await logger.log('fatal', 'sixth')
    expect(await readFile(path, 'utf8')).not.toContain('never-write-me')
    expect(await logger.recent()).toEqual(
      expect.arrayContaining([expect.stringContaining('fatal')]),
    )
    await environment.cleanup()
  })
})
