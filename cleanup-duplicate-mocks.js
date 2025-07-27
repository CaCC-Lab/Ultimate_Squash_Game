#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 重複を削除する対象ファイル
const filesToClean = [
  'tests/unit/test-coverage.test.js',
  'tests/unit/challengeEvaluator.test.js',
  'tests/unit/challenge-progress.test.js',
  'tests/unit/challenge-game-integration.test.js',
  'tests/unit/challengeGenerator.test.js',
  'tests/unit/ranking-controller.test.js',
  'tests/unit/ranking-ui.test.js',
  'tests/unit/challenge-rewards.test.js',
  'tests/unit/ranking-api.test.js',
  'tests/unit/weekly-challenge-api.test.js'
];

function removeDuplicateMocks(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // パターン1: 重複したモック実装を検出
    const duplicatePattern = /\/\* Mock Implementation.*?\*\/[\s\S]*?\/\/ Mock factory function[\s\S]*?\};[\s\S]*?\};[\s\S]*?\/\* Mock Implementation.*?\*\/[\s\S]*?\/\/ Mock factory function[\s\S]*?\};[\s\S]*?\};/g;
    
    if (duplicatePattern.test(content)) {
      // 最初のモック実装だけを残す
      const cleanContent = content.replace(duplicatePattern, (match) => {
        const firstMockEnd = match.indexOf('};', match.indexOf('};') + 2) + 2;
        return match.substring(0, firstMockEnd);
      });
      
      fs.writeFileSync(filePath, cleanContent);
      console.log(`✅ Cleaned duplicates in: ${path.basename(filePath)}`);
      return true;
    }
    
    // パターン2: 重複したクラス定義
    const classPattern = /class (\w+) \{[\s\S]*?module\.exports[^;]*;[\s\S]*?class \1 \{/g;
    
    if (classPattern.test(content)) {
      const cleanContent = content.replace(classPattern, (match, className) => {
        // 最初のクラス定義とexportを残す
        const firstExportEnd = match.indexOf('module.exports', match.indexOf('class')) + 
                              match.substring(match.indexOf('module.exports')).indexOf(';') + 1;
        return match.substring(0, firstExportEnd);
      });
      
      fs.writeFileSync(filePath, cleanContent);
      console.log(`✅ Cleaned duplicate class in: ${path.basename(filePath)}`);
      return true;
    }
    
    // パターン3: 重複したコメント "- Using mock"
    const commentPattern = /\/\/ - Using mock - Using mock/g;
    if (commentPattern.test(content)) {
      const cleanContent = content.replace(commentPattern, '// - Using mock');
      fs.writeFileSync(filePath, cleanContent);
      console.log(`✅ Cleaned duplicate comments in: ${path.basename(filePath)}`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// メイン処理
console.log('🧹 Cleaning up duplicate mock implementations...\n');

let cleanedCount = 0;
filesToClean.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    if (removeDuplicateMocks(fullPath)) {
      cleanedCount++;
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log(`\n✨ Cleanup complete! Cleaned ${cleanedCount} files.`);