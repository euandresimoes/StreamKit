export class SystemNotReadyError extends Error {
  public readonly code = 'SYSTEM_NOT_READY'

  public constructor() {
    super('System is not ready')
    this.name = 'SystemNotReadyError'
  }
}
