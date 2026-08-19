module.exports = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@streamlet/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
  },
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.spec.ts?(x)"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
};
