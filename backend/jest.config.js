module.exports = {
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/tests/unit/**/*.test.js'],
      coverageDirectory: 'coverage/unit',
    },
    {
      displayName: 'integration',
      testMatch: ['**/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.integration.js'],
      testTimeout: 30000,
      maxWorkers: 1,
    },
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!uploads/**',
    '!tests/**',
    '!coverage/**',
  ],
  verbose: true,
}
