import { STREAMLET_APP_ID, STREAMLET_APP_NAME } from '../src'

describe('shared configuration', () => {
  it('exposes stable desktop identity values', () => {
    expect(STREAMLET_APP_NAME).toBe('Streamlet')
    expect(STREAMLET_APP_ID).toBe('com.euandresimoes.streamlet')
  })
})
