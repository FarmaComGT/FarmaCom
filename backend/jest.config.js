/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/database/**',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  verbose: true,
};
