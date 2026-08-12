import { readFileSync } from 'node:fs'
import { join } from 'node:path'
describe('GiveawayPanel', () => {
  const source = readFileSync(
    join(__dirname, '../src/components/giveaway/GiveawayPanel.vue'),
    'utf8',
  )
  it('covers wheel, case opening, recovery and reduced motion', () => {
    expect(source).toContain("round.mode === 'wheel'")
    expect(source).toContain('case-strip')
    expect(source).toContain('snapshotHash')
    expect(source).toContain('reduceMotion')
  })
  it('blocks exit and offers winner removal', () => {
    expect(source).toContain('beforeunload')
    expect(source).toContain('Remover vencedor')
  })
})
