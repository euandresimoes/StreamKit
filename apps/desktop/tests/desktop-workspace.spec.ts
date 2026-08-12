import { DESKTOP_RUNTIME } from '../src/main'

describe('desktop workspace', () => {
  it('declares Electron as its runtime', () => {
    expect(DESKTOP_RUNTIME).toBe('electron')
  })
})
