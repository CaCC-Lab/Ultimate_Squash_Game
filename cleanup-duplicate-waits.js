#!/usr/bin/env node
/**
 * Phase 5B: 重複するスクリプト読み込み待機コードをクリーンアップ
 */

const fs = require('fs');

const testFile = '/Users/ryu/dev/ultimate_squash_game/tests/e2e/test-phase4-parallel-initialization.spec.js';

// テストファイルを読み込み
let content = fs.readFileSync(testFile, 'utf8');

// 重複するスクリプト読み込み待機コードを削除
content = content.replace(/(\s+\/\/ スクリプト読み込み完了まで待機\s+await page\.waitForFunction\(\(\) => \{\s+return window\.scriptLoadingStatus && window\.scriptLoadingStatus\.allLoaded;\s+\}, \{ timeout: 15000 \}\);\s*\n){2,}/g, '$1');

// 連続する同一待機コードをまとめる
content = content.replace(/(\s+await page\.waitForFunction\(\(\) => \{\s+return window\.scriptLoadingStatus && window\.scriptLoadingStatus\.allLoaded;\s+\}, \{ timeout: 15000 \}\);\s*\n){2,}/g, '$1');

// ファイルに書き戻し
fs.writeFileSync(testFile, content, 'utf8');

console.log('✅ 重複する待機コードのクリーンアップが完了しました');
