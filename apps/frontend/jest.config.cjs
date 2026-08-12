const base = require('../../jest.base.cjs')

module.exports = {
  ...base,
  moduleFileExtensions: [...base.moduleFileExtensions, 'vue'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^@vue/test-utils$': '<rootDir>/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js',
  },
  testEnvironment: 'jsdom',
  transform: {
    ...base.transform,
    '^.+\\.vue$': '@vue/vue3-jest',
  },
}
