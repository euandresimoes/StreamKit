const base = require('../../jest.base.cjs')

module.exports = {
  ...base,
  testMatch: ['<rootDir>/tests/**/*.integration.spec.ts'],
  testPathIgnorePatterns: [],
}
