#!/usr/bin/env node
/**
 * 週替わりチャレンジシステム統合テスト
 * HTMLとJavaScriptの基本統合を確認
 */

const fs = require('fs');
const path = require('path');

console.log('🏆 週替わりチャレンジシステム統合テスト開始...');

// 1. 必要なファイルの存在確認
const requiredFiles = [
    'docs/game.html',
    'docs/js/weekly-challenge.js',
    'docs/js/weekly-challenge-api.js'
];

let allFilesExist = true;

console.log('\n📁 必要ファイルの存在確認:');
for (const filePath of requiredFiles) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${filePath}`);
    } else {
        console.log(`❌ ${filePath} - ファイルが見つかりません`);
        allFilesExist = false;
    }
}

if (!allFilesExist) {
    console.log('\n❌ 必要なファイルが不足しています');
    process.exit(1);
}

// 2. HTMLファイル内のチャレンジシステム要素確認
console.log('\n🔍 HTMLファイル内のチャレンジシステム要素確認:');
const htmlContent = fs.readFileSync('docs/game.html', 'utf-8');

const requiredElements = [
    { name: 'Connection Status', pattern: /connection-status/ },
    { name: 'Challenge Button', pattern: /challenge-button|challengeButton/ },
    { name: 'Challenge Modal', pattern: /challengeModal/ },
    { name: 'Challenge Info', pattern: /challengeInfo/ },
    { name: 'Challenge Parameters', pattern: /challengeParams/ },
    { name: 'Challenge Leaderboard', pattern: /challengeLeaderboard/ },
    { name: 'WebSocket Manager Class', pattern: /class WebSocketManager/ },
    { name: 'Challenge System Class', pattern: /class ChallengeSystem/ }
];

let allElementsPresent = true;

for (const element of requiredElements) {
    if (element.pattern.test(htmlContent)) {
        console.log(`✅ ${element.name} - 見つかりました`);
    } else {
        console.log(`❌ ${element.name} - 見つかりません`);
        allElementsPresent = false;
    }
}

// 3. チャレンジモジュールの機能テスト
console.log('\n🧪 チャレンジモジュールの機能テスト:');

try {
    // WeeklyChallenge モジュールのテスト
    const { WeeklyChallenge, ChallengeGenerator, calculateWeekNumber } = require('./docs/js/weekly-challenge.js');
    
    const currentDate = new Date();
    const challenge = new WeeklyChallenge(currentDate);
    const challengeInfo = challenge.getChallengeInfo();
    const levelParams = challenge.getLevelParameters();
    
    if (challengeInfo && challengeInfo.id && challengeInfo.startDate && challengeInfo.endDate) {
        console.log(`✅ WeeklyChallenge: チャレンジ生成成功`);
        console.log(`   - ID: ${challengeInfo.id}`);
        console.log(`   - 開始日: ${challengeInfo.startDate.toLocaleDateString('ja-JP')}`);
        console.log(`   - 終了日: ${challengeInfo.endDate.toLocaleDateString('ja-JP')}`);
    } else {
        console.log('❌ WeeklyChallenge: チャレンジ情報の生成に失敗');
        console.log(`   - challengeInfo: ${JSON.stringify(challengeInfo)}`);
        allElementsPresent = false;
    }
    
    if (levelParams && levelParams.ballSpeed && levelParams.paddleSize) {
        console.log(`✅ LevelParameters: 生成成功`);
        console.log(`   - ボール速度: ${levelParams.ballSpeed}`);
        console.log(`   - パドルサイズ: ${levelParams.paddleSize}`);
    } else {
        console.log('❌ LevelParameters: パラメータ生成に失敗');
        allElementsPresent = false;
    }
    
    // WeeklyChallengeAPI モジュールのテスト
    const { WeeklyChallengeAPI } = require('./docs/js/weekly-challenge-api.js');
    const api = new WeeklyChallengeAPI('http://test.example.com');
    
    if (api && typeof api.submitChallengeScore === 'function') {
        console.log('✅ WeeklyChallengeAPI: インスタンス作成成功');
    } else {
        console.log('❌ WeeklyChallengeAPI: インスタンス作成に失敗');
        allElementsPresent = false;
    }
    
} catch (error) {
    console.log(`❌ チャレンジモジュールテストエラー: ${error.message}`);
    allElementsPresent = false;
}

// 4. CSS スタイル確認
console.log('\n🎨 チャレンジシステム用CSSスタイル確認:');

const cssElements = [
    { name: 'Challenge Button Styles', pattern: /\.challenge-button/ },
    { name: 'Connection Status Styles', pattern: /\.connection-status/ },
    { name: 'Challenge Parameters Grid', pattern: /\.challenge-params-grid/ },
    { name: 'Leaderboard Entry Styles', pattern: /\.leaderboard-entry/ },
    { name: 'Challenge Actions Styles', pattern: /\.challenge-actions/ }
];

for (const cssElement of cssElements) {
    if (cssElement.pattern.test(htmlContent)) {
        console.log(`✅ ${cssElement.name} - 定義済み`);
    } else {
        console.log(`❌ ${cssElement.name} - 未定義`);
        // CSS不足は警告レベル（致命的ではない）
    }
}

// 5. JavaScript関数とイベントハンドラ確認
console.log('\n⚙️ JavaScript関数とイベントハンドラ確認:');

const jsFunctions = [
    { name: 'WebSocket Connection', pattern: /wsManager\.connect/ },
    { name: 'Challenge System Init', pattern: /new ChallengeSystem/ },
    { name: 'Show Challenge Menu', pattern: /showChallengeMenu/ },
    { name: 'Load Challenge Modules', pattern: /loadChallengeModules/ },
    { name: 'Start Challenge', pattern: /startChallenge/ },
    { name: 'Display Challenge Info', pattern: /displayChallengeInfo/ },
    { name: 'Display Leaderboard', pattern: /displayLeaderboard/ }
];

for (const jsFunction of jsFunctions) {
    if (jsFunction.pattern.test(htmlContent)) {
        console.log(`✅ ${jsFunction.name} - 実装済み`);
    } else {
        console.log(`❌ ${jsFunction.name} - 未実装`);
        allElementsPresent = false;
    }
}

// 結果レポート
console.log('\n' + '='.repeat(60));
if (allElementsPresent) {
    console.log('🎉 週替わりチャレンジシステムの統合が完了しました！');
    console.log('✅ 全ての必要なコンポーネントが実装されています');
    console.log('✅ HTMLとJavaScriptの統合が正常です');
    console.log('✅ チャレンジモジュールが動作しています');
    console.log('\n📋 実装されたコンポーネント:');
    console.log('   - WebSocket接続状態表示');
    console.log('   - チャレンジボタンとモーダル');
    console.log('   - 週替わりチャレンジ生成システム');
    console.log('   - チャレンジAPIクライアント');
    console.log('   - リーダーボード表示');
    console.log('   - チャレンジパラメータ管理');
    console.log('\n🚀 次のステップ: WebSocketサーバーとの通信テストを実施');
} else {
    console.log('❌ 週替わりチャレンジシステムの統合が不完全です');
    console.log('   必要なコンポーネントが不足しています');
}

console.log('\n🔧 統合テスト完了');
process.exit(allElementsPresent ? 0 : 1);