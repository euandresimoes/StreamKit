import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('update UI', () => {
  const app = readFileSync(resolve(__dirname, '../src/App.vue'), 'utf8')
  const store = readFileSync(resolve(__dirname, '../src/stores/update.store.ts'), 'utf8')
  it('offers manual check, download, skip and install controls', () => {
    expect(app).toContain('Verificar atualizações agora')
    expect(app).toContain('Pular esta versão')
    expect(app).toContain('Atualizar agora')
    expect(app).toContain('Instalar e reiniciar')
  })
  it('keeps update failures recoverable and confirms an active operation', () => {
    expect(app).toContain('O StreamKit continua disponível')
    expect(app).toContain('Interromper operação ativa?')
    expect(store).toContain("action: 'check'")
  })
})
