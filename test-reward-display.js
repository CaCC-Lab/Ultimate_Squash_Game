#!/usr/bin/env node
/**
 * 報酬表示UIのテストスクリプト
 * ブラウザコンソールで実行してチャレンジ完了時の報酬表示をテスト
 */

// ブラウザ環境でこのスクリプトを実行するためのコード
(function() {
    'use strict';

    console.log('🧪 報酬表示UIテストを開始します...');

    // 必要なクラスが読み込まれているかチェック
    function checkDependencies() {
        const requiredClasses = [
            'WeeklyChallengeIntegration',
            'ChallengeRewards',
            'WeeklyChallengeDebug',
            'RewardDisplayUI'
        ];

        const missing = [];
        for (const className of requiredClasses) {
            if (!window[className]) {
                missing.push(className);
            }
        }

        if (missing.length > 0) {
            console.error('❌ 必要なクラスが見つかりません:', missing);
            return false;
        }

        console.log('✅ すべての必要なクラスが利用可能です');
        return true;
    }

    // 報酬表示UIを初期化
    function initializeRewardDisplayUI() {
        if (!window.rewardDisplayUI) {
            window.rewardDisplayUI = new RewardDisplayUI();
            console.log('✅ RewardDisplayUIを初期化しました');
        }
    }

    // モックデータでチャレンジ完了をシミュレート
    function simulateChallengeCompletion() {
        console.log('🎮 チャレンジ完了をシミュレートします...');

        // WeeklyChallengeIntegrationのインスタンスを作成（存在しない場合）
        let integration;
        if (window.weeklyChallengeIntegration) {
            integration = window.weeklyChallengeIntegration;
        } else {
            integration = new WeeklyChallengeIntegration();
            window.weeklyChallengeIntegration = integration;
        }

        // モックチャレンジデータを作成
        const mockChallenge = {
            id: 'test-challenge-1',
            title: 'スコアマスターチャレンジ',
            type: 'score',
            difficulty: 'intermediate',
            target: 2000,
            description: '2000点以上のスコアを獲得してください'
        };

        integration.currentChallenge = mockChallenge;

        // モックゲーム統計を作成
        const mockGameStats = {
            score: 2500,
            gameDuration: 180000, // 3分
            missCount: 5,
            powerupsUsed: 3,
            maxCombo: 15,
            consecutiveHits: 12,
            totalHits: 25,
            specialActions: ['multi_ball_activated', 'powerup_collected']
        };

        // モック評価結果を作成
        const mockEvaluation = {
            completed: true,
            score: mockGameStats.score,
            progress: 100,
            duration: mockGameStats.gameDuration,
            ...mockGameStats
        };

        // チャレンジ完了処理を呼び出し
        integration.onChallengeCompleted(mockEvaluation);

        console.log('✅ チャレンジ完了シミュレーション完了');
    }

    // 報酬表示UIを直接テスト
    function testRewardDisplayUI() {
        console.log('🎨 報酬表示UIを直接テストします...');

        if (!window.rewardDisplayUI) {
            initializeRewardDisplayUI();
        }

        // テスト用報酬データ
        const testRewardData = {
            totalPoints: 850,
            titles: ['スコアマスター'],
            badges: ['初回達成', 'コンボキング'],
            achievements: [
                {
                    id: 'score_master',
                    name: 'スコアマスター',
                    description: '2000点以上を達成',
                    icon: '🏆',
                    points: 100
                },
                {
                    id: 'combo_king',
                    name: 'コンボキング',
                    description: '15回以上の連続ヒット',
                    icon: '🔥',
                    points: 50
                }
            ],
            summary: {
                basePoints: 500,
                bonusPoints: 200,
                achievementPoints: 150,
                streakPoints: 0,
                rankingPoints: 0
            }
        };

        // テスト用チャレンジデータ
        const testChallengeData = {
            id: 'test-challenge-1',
            name: 'スコアマスターチャレンジ',
            type: 'score',
            difficulty: 'intermediate'
        };

        // テスト用ゲーム統計
        const testGameStats = {
            score: 2500,
            gameDuration: 180000,
            missCount: 5,
            powerupsUsed: 3,
            maxCombo: 15
        };

        // 報酬表示UIを実行
        window.rewardDisplayUI.show(testRewardData, testChallengeData, testGameStats);

        console.log('✅ 報酬表示UIテスト実行完了');
    }

    // 統合テストを実行
    function runIntegratedTest() {
        console.log('🔧 統合テストを開始します...');

        setTimeout(() => {
            simulateChallengeCompletion();
        }, 1000);

        console.log('✅ 統合テスト完了');
    }

    // メイン実行関数
    function runTests() {
        console.log('🚀 報酬表示UIテストスイートを開始...');

        if (!checkDependencies()) {
            console.error('❌ 依存関係チェックに失敗しました');
            return;
        }

        initializeRewardDisplayUI();

        // 実行オプションの選択
        console.log('実行可能なテスト:');
        console.log('1. testRewardDisplayUI() - UIを直接テスト');
        console.log('2. simulateChallengeCompletion() - チャレンジ完了シミュレート');
        console.log('3. runIntegratedTest() - 統合テスト');

        // グローバルに公開
        window.testRewardDisplay = {
            testRewardDisplayUI,
            simulateChallengeCompletion,
            runIntegratedTest,
            checkDependencies,
            initializeRewardDisplayUI
        };

        console.log('✅ テスト関数をwindow.testRewardDisplayに設定しました');
        console.log('例: window.testRewardDisplay.testRewardDisplayUI()');
    }

    // DOM読み込み完了後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }

})();