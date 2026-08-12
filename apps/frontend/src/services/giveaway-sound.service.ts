export interface GiveawaySoundService {
  play(event: 'draw-started' | 'winner-revealed'): Promise<void>
}
export class SilentGiveawaySoundService implements GiveawaySoundService {
  public async play(): Promise<void> {}
}
export const giveawaySoundService: GiveawaySoundService = new SilentGiveawaySoundService()
