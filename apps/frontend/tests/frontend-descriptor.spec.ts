import { createFrontendDescriptor } from '../src'

describe('frontend workspace', () => {
  it('declares the approved frontend foundation', () => {
    expect(createFrontendDescriptor()).toEqual({
      framework: 'vue',
      state: 'pinia',
      styles: 'scss',
    })
  })
})
