#!/usr/bin/env node
/**
 * Phase 5B: ParallelInitializer not found エラー修正
 * テストファイルにスクリプト読み込み完了待機を一括追加
 */

const fs = require('fs');
const path = require('path');

const testFile = '/Users/ryu/dev/ultimate_squash_game/tests/e2e/test-phase4-parallel-initialization.spec.js';

// テストファイルを読み込み
let content = fs.readFileSync(testFile, 'utf8');

// スクリプト読み込み完了待機コードを定義
const scriptWaitCode = `        // スクリプト読み込み完了まで待機
        await page.waitForFunction(() => {
            return window.scriptLoadingStatus && window.scriptLoadingStatus.allLoaded;
        }, { timeout: 15000 });
        `;

// page.goto直後にスクリプト読み込み待機を追加する正規表現パターン
const patterns = [
  {
    search: /(\s+await page\.goto\('http:\/\/localhost:3000\/game\.html'\);\s*\n)(\s+\/\/ (?!スクリプト読み込み完了まで待機))/g,
    replace: `$1${scriptWaitCode}\n$2`
  },
  {
    search: /(\s+await page\.goto\('http:\/\/localhost:3000\/game\.html'\);\s*\n)(\s+(?!\/\/)(?!await page\.waitForFunction\(\(\) => \{\s*return window\.scriptLoadingStatus))/g,
    replace: `$1${scriptWaitCode}\n$2`
  }
];

// パターンマッチングして置換
patterns.forEach(pattern => {
  content = content.replace(pattern.search, pattern.replace);
});

// 重複する待機コードを削除
content = content.replace(/(\s+\/\/ スクリプト読み込み完了まで待機\s+await page\.waitForFunction[^}]+}\);\s*\n){2,}/g, '$1');

// ファイルに書き戻し
fs.writeFileSync(testFile, content, 'utf8');

console.log('✅ テストファイルの修正が完了しました');
console.log('📝 追加された機能:');
console.log('  - 全テストメソッドにスクリプト読み込み完了待機を追加');
console.log('  - ParallelInitializer not found エラーの予防');
console.log('  - テスト安定性の向上');
