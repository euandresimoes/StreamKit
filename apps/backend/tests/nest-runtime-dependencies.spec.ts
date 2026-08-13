describe('Nest runtime dependencies', () => {
  it.each(['class-transformer', 'class-validator'])(
    'keeps %s resolvable when the backend is bundled into Electron',
    (dependency) => {
      expect(() => require.resolve(dependency)).not.toThrow()
    },
  )
})
