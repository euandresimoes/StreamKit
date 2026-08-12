import { BackendConnectionSchema, CreateWorkspaceRequestSchema, WorkspaceNameSchema } from '../src'

describe('WorkspaceNameSchema', () => {
  it('accepts a non-empty workspace name', () => {
    expect(WorkspaceNameSchema.parse('Minha live')).toBe('Minha live')
  })

  it('rejects a blank workspace name', () => {
    expect(() => WorkspaceNameSchema.parse('   ')).toThrow()
  })

  it('normalizes a create workspace request', () => {
    expect(CreateWorkspaceRequestSchema.parse({ name: '  Filmes  ' })).toEqual({
      name: 'Filmes',
    })
  })

  it('only accepts authenticated IPv4 loopback backend connections', () => {
    const token = 'a'.repeat(64)

    expect(BackendConnectionSchema.parse({ baseUrl: 'http://127.0.0.1:49152', token })).toEqual({
      baseUrl: 'http://127.0.0.1:49152',
      token,
    })
    expect(() =>
      BackendConnectionSchema.parse({ baseUrl: 'http://localhost:49152', token }),
    ).toThrow()
  })
})
