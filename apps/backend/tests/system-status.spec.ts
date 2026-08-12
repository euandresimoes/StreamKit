import { SystemController } from '../src/modules/system/controllers/system.controller'
import { SystemStatusService } from '../src/modules/system/services/system-status.service'

describe('backend workspace', () => {
  it('keeps controller orchestration separate from the use case', () => {
    const controller = new SystemController(new SystemStatusService())

    expect(controller.getStatus()).toEqual({ status: 'ok' })
  })
})
