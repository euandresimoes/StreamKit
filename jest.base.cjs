/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8',
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@streamlet/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@streamlet/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    '^@streamlet/test-utils$': '<rootDir>/../../packages/test-utils/src/index.ts',
    '^@streamlet/backend$': '<rootDir>/../../apps/backend/src/main.ts',
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  testPathIgnorePatterns: ['\\.e2e\\.spec\\.ts$', '\\.integration\\.spec\\.ts$'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
}
