import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

function contrast(first: string, second: string): number {
  const [bright, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (bright! + 0.05) / (dark! + 0.05)
}

describe('design system contracts', () => {
  const frontendRoot = resolve(__dirname, '..')

  it.each([
    ['light primary text', '#171a20', '#ffffff'],
    ['light secondary text', '#4b5563', '#ffffff'],
    ['dark primary text', '#edf0f5', '#25282f'],
    ['dark secondary text', '#b2bac7', '#25282f'],
    ['light accent text', '#ffffff', '#1668c7'],
  ])('%s meets WCAG AA contrast', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it('defines all themeable visual dimensions as custom properties', () => {
    const tokens = [
      'background',
      'foreground',
      'border',
      'radius',
      'shadow',
      'outline',
      'focus',
      'space',
      'font',
      'opacity',
      'z-',
      'motion',
    ]
    const sources = ['tokens/_foundation.scss', 'tokens/_semantic.scss', 'tokens/_components.scss']
      .map((file) => readFileSync(resolve(frontendRoot, 'src/styles', file), 'utf8'))
      .join('\n')

    for (const token of tokens) expect(sources).toContain(token)
  })

  it('keeps component styles scoped and avoids unexplained important rules', () => {
    const app = readFileSync(resolve(frontendRoot, 'src/App.vue'), 'utf8')
    const accessibility = readFileSync(
      resolve(frontendRoot, 'src/styles/utilities/_accessibility.scss'),
      'utf8',
    )

    expect(app).toContain('<style scoped lang="scss">')
    expect(app).not.toContain('!important')
    expect(accessibility.match(/!important/g)).toHaveLength(8)
    expect(accessibility).toContain('prefers-reduced-motion: reduce')
  })

  it('provides light, dark and system theme selectors without changing component selectors', () => {
    const light = readFileSync(resolve(frontendRoot, 'src/styles/themes/_light.scss'), 'utf8')
    const dark = readFileSync(resolve(frontendRoot, 'src/styles/themes/_dark.scss'), 'utf8')
    const system = readFileSync(resolve(frontendRoot, 'src/styles/themes/_system.scss'), 'utf8')

    expect(light).toContain("[data-theme='light']")
    expect(dark).toContain("[data-theme='dark']")
    expect(system).toContain("[data-theme='system']")
    expect(system).toContain('prefers-color-scheme: dark')
  })
})
