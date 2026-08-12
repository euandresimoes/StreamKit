import { readFile } from 'node:fs/promises'

import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { WindowStateRepository } from '../src/main/window-state.repository'

describe('WindowStateRepository', () => {
  it('persists and restores validated window bounds atomically', async () => {
    const environment = await createIsolatedTestEnvironment()

    try {
      const statePath = `${environment.userDataPath}/settings-window.json`
      const repository = new WindowStateRepository(statePath)
      const bounds = { height: 720, width: 960, x: 120, y: 80 }

      await repository.save(bounds)

      await expect(repository.load()).resolves.toEqual(bounds)
      await expect(readFile(`${statePath}.tmp`, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await environment.cleanup()
    }
  })

  it('ignores missing persisted state', async () => {
    const environment = await createIsolatedTestEnvironment()

    try {
      const repository = new WindowStateRepository(`${environment.userDataPath}/missing.json`)
      await expect(repository.load()).resolves.toBeNull()
    } finally {
      await environment.cleanup()
    }
  })
})
