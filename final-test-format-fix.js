#!/usr/bin/env node
/**
 * Phase 5B: テストファイルの最終フォーマット修正
 */

const fs = require('fs');

const testFile = '/Users/ryu/dev/ultimate_squash_game/tests/e2e/test-phase4-parallel-initialization.spec.js';

// テストファイルを読み込み
let content = fs.readFileSync(testFile, 'utf8');

// フォーマットを修正
content = content.replace(/(\s+await page\.goto\('http:\/\/localhost:3000\/game\.html'\);)(\s+\/\/ スクリプト読み込み完了まで待機)/g, '$1\n$2');

// インデントを統一
content = content.replace(/^(\s+)await page\.goto\('http:\/\/localhost:3000\/game\.html'\);(\s+)\/\/ スクリプト読み込み完了まで待機/gm, '$1await page.goto(\'http://localhost:3000/game.html\');\n$1\n$1// スクリプト読み込み完了まで待機');

// ファイルに書き戻し
fs.writeFileSync(testFile, content, 'utf8');

console.log('✅ テストファイルのフォーマット修正が完了しました');