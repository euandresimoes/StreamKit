export interface SystemRepository {
  isReady(): Promise<boolean>
}
