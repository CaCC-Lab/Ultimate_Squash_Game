/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  // extensionsToTreatAsEsm は削除 - .jsは自動的に推論される
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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/docs/js/$1',
    // .js拡張子を含むインポートパスの解決
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Node.js ES6モジュール対応
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  // グローバル設定
  globals: {
    'NODE_ENV': 'test',
  },
  // 実験的なVMモジュール（ES6モジュール完全サポート）
  // 必要に応じてコメントアウトを解除
  // experimental: {
  //   vm_modules: true,
  // },
  verbose: true,
};