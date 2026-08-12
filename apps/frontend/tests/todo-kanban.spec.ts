import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('TODO Kanban UI', () => {
  const source = readFileSync(join(__dirname, '../src/components/todo/TodoKanban.vue'), 'utf8')
  it('uses the base design system and exposes explicit destructive choices', () => {
    expect(source).toContain('BaseModal')
    expect(source).toContain('Mover cards')
    expect(source).toContain('Apagar cards')
    expect(source).toContain('Excluir workspace?')
  })
  it('provides keyboard button alternatives for every reorder action', () => {
    expect(source).toContain('Mover coluna para esquerda')
    expect(source).toContain('Mover coluna para direita')
    expect(source).toContain('Mover card para cima')
    expect(source).toContain('Mover card para baixo')
  })
})
