export class ApiApplicationError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details: unknown = null,
  ) {
    super(message)
    this.name = 'ApiApplicationError'
  }
}
