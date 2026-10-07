/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/integration/setup-env.js'],
  clearMocks: true,
  verbose: true,
  testTimeout: 30000,
};
