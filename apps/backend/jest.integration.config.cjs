const base = require('../../jest.base.cjs')

module.exports = {
  ...base,
  maxWorkers: 1,
  testMatch: ['<rootDir>/tests/**/*.integration.spec.ts'],
  testPathIgnorePatterns: [],
}
