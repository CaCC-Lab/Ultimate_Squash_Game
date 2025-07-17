export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js'],
  collectCoverageFrom: [
    'docs/js/**/*.js',
    '!docs/js/game.js', // メインゲームファイルは除外
    '!docs/js/ranking.js', // エントリーポイントは除外
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/docs/js/$1',
  },
  verbose: true,
};