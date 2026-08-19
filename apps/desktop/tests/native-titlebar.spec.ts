import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('native window titlebar', () => {
  const main = readFileSync(resolve(__dirname, '../src/main/index.ts'), 'utf8')
  const appShell = readFileSync(
    resolve(__dirname, '../../frontend/src/components/streamlet/AppShell.tsx'),
    'utf8',
  )
  const styles = readFileSync(resolve(__dirname, '../../frontend/src/styles.css'), 'utf8')

  it('uses a full-content titlebar with native controls on every desktop platform', () => {
    expect(main).toContain("titleBarStyle: 'hidden'")
    expect(main).toContain('titleBarOverlay:')
    expect(main).toContain("process.platform === 'darwin'")
    expect(main).not.toContain('frame: false')
  })

  it('uses the application header as the draggable titlebar without mock window controls', () => {
    expect(appShell).toContain('streamlet-titlebar')
    expect(appShell).not.toContain('oklch(0.64 0.17 25)')
    expect(appShell).not.toContain('rounded-[26px]')
    expect(styles).toContain('-webkit-app-region: drag')
    expect(styles).toContain('env(titlebar-area-width, 100%)')
    expect(styles).toContain('streamlet-titlebar__content--fullscreen')
  })
})
