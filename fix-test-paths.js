#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// E2Eテストディレクトリ
const e2eDir = path.join(__dirname, 'tests', 'e2e');

// 修正対象のファイルパターン
const targetExtension = '.spec.js';

// パスの修正パターン
const replacements = [
  // 相対パスの修正
  { from: /await page\.goto\('\/game\.html'\)/g, to: "await page.goto('/docs/game.html')" },
  // helpers.jsのコメントも修正
  { from: /await page\.goto\('\/game\.html'\);\s*\/\/.*$/gm, to: "await page.goto('/docs/game.html');" },
  // PWAのstart_urlも修正（manifest.jsonで参照されているため）
  { from: /start_url\).toBe\('\/game\.html'\)/g, to: "start_url).toBe('/docs/game.html')" },
  // 絶対URLで既にローカルホストを含むものは/game.htmlを/docs/game.htmlに
  { from: /http:\/\/localhost:3000\/game\.html/g, to: 'http://localhost:3000/docs/game.html' },
  { from: /http:\/\/localhost:8080\/game\.html/g, to: 'http://localhost:8080/docs/game.html' }
];

// ファイルを再帰的に処理
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith(targetExtension) || file === 'helpers.js') {
      processFile(filePath);
    }
  });
}

// ファイルを処理
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    const originalContent = content;
    content = content.replace(from, to);
    if (originalContent !== content) {
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Modified: ${filePath}`);
  } else {
    console.log(`  No changes needed: ${filePath}`);
  }
}

// メイン実行
console.log('Fixing test paths...\n');
processDirectory(e2eDir);
console.log('\nDone!');
