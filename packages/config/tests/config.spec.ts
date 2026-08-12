import { STREAMKIT_APP_ID, STREAMKIT_APP_NAME } from '../src'

describe('shared configuration', () => {
  it('exposes stable desktop identity values', () => {
    expect(STREAMKIT_APP_NAME).toBe('StreamKit')
    expect(STREAMKIT_APP_ID).toBe('com.euandresimoes.streamkit')
  })
})
