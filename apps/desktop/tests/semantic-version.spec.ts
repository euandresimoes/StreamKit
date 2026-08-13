import { compareSemanticVersions, shouldPresentUpdate } from '../src/main/semantic-version'

describe('semantic version comparison', () => {
  it.each([
    ['1.0.1', '1.0.0', 1],
    ['1.0.0', '1.0.0', 0],
    ['1.0.0-beta.2', '1.0.0-beta.10', -1],
    ['1.0.0', '1.0.0-beta', 1],
    ['v2.0.0', '1.99.99', 1],
  ] as const)('%s versus %s', (left, right, result) =>
    expect(compareSemanticVersions(left, right)).toBe(result),
  )
  it('rejects incomplete and leading-zero versions', () => {
    expect(() => compareSemanticVersions('1.0', '1.0.0')).toThrow()
    expect(() => compareSemanticVersions('01.0.0', '1.0.0')).toThrow()
  })
  it('hides skipped and stale updates while presenting a newer release', () => {
    expect(shouldPresentUpdate('1.0.0', '1.1.0', null)).toBe(true)
    expect(shouldPresentUpdate('1.0.0', '1.1.0', '1.1.0')).toBe(false)
    expect(shouldPresentUpdate('1.1.0', '1.0.0', null)).toBe(false)
  })
})
