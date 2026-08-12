import { WorkspaceNameSchema } from '../src'

describe('WorkspaceNameSchema', () => {
  it('accepts a non-empty workspace name', () => {
    expect(WorkspaceNameSchema.parse('Minha live')).toBe('Minha live')
  })

  it('rejects a blank workspace name', () => {
    expect(() => WorkspaceNameSchema.parse('   ')).toThrow()
  })
})
