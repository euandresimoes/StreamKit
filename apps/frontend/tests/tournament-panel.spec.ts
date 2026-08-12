import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('TournamentPanel', () => {
  const source = readFileSync(
    resolve(__dirname, '../src/components/tournament/TournamentPanel.vue'),
    'utf8',
  )
  it('offers mouse, drag and keyboard seeding controls', () => {
    expect(source).toContain('@dragstart')
    expect(source).toContain('Mover ${participant.displayName} para cima')
    expect(source).toContain('tabindex="0"')
  })
  it('renders a horizontally scrollable bracket with semantic theme tokens', () => {
    expect(source).toContain('overflow: auto')
    expect(source).toContain('--sk-bg-panel')
    expect(source).toContain('aria-label="Bracket do torneio"')
  })
  it('confirms descendant invalidation and protects active tournaments on exit', () => {
    expect(source).toContain('Resultados dependentes serão invalidados')
    expect(source).toContain("status === 'in_progress'")
    expect(source).toContain("addEventListener('beforeunload'")
  })
  it('keeps team slots visible with drag and accessible move rollback controls', () => {
    expect(source).toContain('Slot vazio')
    expect(source).toContain('@drop="dropMember(team.id, slot)"')
    expect(source).toContain('Selecionar para mover')
    expect(source).toContain('Mover para cá')
    expect(source).toContain('store.moveTeamMember')
  })
})
