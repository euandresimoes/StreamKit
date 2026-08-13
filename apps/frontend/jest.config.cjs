module.exports = {
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.spec.ts?(x)"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
};
