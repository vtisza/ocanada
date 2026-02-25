/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  // Use V8's built-in coverage — no Babel instrumentation rewriting,
  // which avoids TDZ errors caused by Istanbul hoisting analysis.
  coverageProvider: 'v8',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['js/data.js', 'js/game.js'],
  coverageReporters: ['text', 'lcov'],
};
