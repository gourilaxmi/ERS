const path = require('path')

module.exports = {
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '../..'),
  setupFilesAfterEnv: [path.resolve(__dirname, 'setup.integration.js')],
  testMatch: ['**/tests/integration/**/*.test.js'],
  verbose: true,
  collectCoverage: false,
  testTimeout: 30000,
  maxWorkers: 1,
}
