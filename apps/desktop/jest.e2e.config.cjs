const base = require('../../jest.base.cjs')

module.exports = {
  ...base,
  testMatch: ['<rootDir>/tests/**/*.e2e.spec.ts'],
  testPathIgnorePatterns: [],
}
