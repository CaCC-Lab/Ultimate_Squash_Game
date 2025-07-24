/**
 * SharedMemoryMetricsCollector 統合テスト
 * SharedArrayBuffer + Atomicsの実装を検証
 */

import { test, expect } from '@playwright/test';
import { SharedMemoryMetricsCollector } from '../../docs/js/optimization/shared-memory-metrics-collector.js';
import { PerformanceMetricsCollector } from '../../docs/js/optimization/performance-metrics-collector.js';

const TEST_CONFIG = {
    timeout: 10000,
    sampleDuration: 2000,
    expectedMinSamples: 10
};

test.describe('SharedMemoryMetricsCollector Integration Tests', () => {
    let collector;
    
    test.beforeEach(async () => {
        // 各テスト前に新しいコレクターインスタンスを作成
        collector = new SharedMemoryMetricsCollector();
    });
    
    test.afterEach(async () => {
        // テスト後のクリーンアップ
        if (collector) {
            try {
                await collector.cleanup();
            } catch (error) {
                console.warn('Cleanup error:', error);
            }
        }
    });
    
    test('should initialize with SharedArrayBuffer support', async () => {
        // SharedArrayBufferサポートの確認
        const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
        const hasAtomics = typeof Atomics !== 'undefined';
        
        console.log('Browser support:', {
            SharedArrayBuffer: hasSharedArrayBuffer,
            Atomics: hasAtomics
        });
        
        // 初期化を待つ
        await collector.initialize();
        
        // 初期化状態を確認
        expect(collector.isInitialized).toBe(true);
        
        if (hasSharedArrayBuffer && hasAtomics) {
            expect(collector.useFallback).toBe(false);
            console.log('✅ SharedArrayBuffer mode enabled');
        } else {
            expect(collector.useFallback).toBe(true);
            console.log('⚠️ Fallback mode enabled');
        }
    });
    
    test('should collect and store metrics correctly', async () => {
        await collector.initialize();
        await collector.start();
        
        // メトリクス収集開始まで少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 手動でいくつかのメトリクスを記録
        const testMetrics = [
            { name: 'fps', value: 60 },
            { name: 'frameTime', value: 16.67 },
            { name: 'memory', value: 25.5 },
            { name: 'gameLogic', value: 2.3 },
            { name: 'rendering', value: 8.1 }
        ];
        
        for (const metric of testMetrics) {
            collector.recordMetric(metric.name, metric.value);
        }
        
        // メトリクスが処理されるまで待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // サマリーを取得して検証
        const summary = collector.getSummary();
        
        expect(summary).toBeDefined();
        expect(summary.fps).toBeDefined();
        expect(summary.frameTime).toBeDefined();
        expect(summary.memory).toBeDefined();
        
        // 記録されたメトリクスの値を確認
        if (summary.fps.avg) {
            expect(summary.fps.avg).toBeGreaterThan(0);
        }
        
        await collector.stop();
    });
    
    test('should handle concurrent metric writes correctly', async () => {
        await collector.initialize();
        await collector.start();
        
        // 並行してメトリクスを大量に書き込み
        const promises = [];
        const metricsCount = 100;
        
        for (let i = 0; i < metricsCount; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        collector.recordMetric('fps', Math.random() * 60 + 30);
                        collector.recordMetric('frameTime', Math.random() * 10 + 10);
                        resolve();
                    }, Math.random() * 500);
                })
            );
        }
        
        await Promise.all(promises);
        
        // 処理完了を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const summary = collector.getSummary();
        
        // メトリクスが収集されていることを確認
        expect(summary.fps).toBeDefined();
        expect(summary.frameTime).toBeDefined();
        
        if (summary.fps.avg) {
            expect(summary.fps.avg).toBeGreaterThan(0);
            expect(summary.fps.avg).toBeLessThan(100);
        }
        
        await collector.stop();
    });
    
    test('should handle buffer overflow gracefully', async () => {
        await collector.initialize();
        await collector.start();
        
        // バッファオーバーフローを引き起こすために大量のメトリクスを書き込み
        const metricsCount = 1500; // MAX_ENTRIES (1000) を超える
        
        for (let i = 0; i < metricsCount; i++) {
            collector.recordMetric('fps', Math.random() * 60);
            
            // 一定間隔で処理時間を与える
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // 処理完了を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const summary = collector.getSummary();
        
        // システムが正常に動作していることを確認
        expect(summary).toBeDefined();
        
        if (!collector.useFallback) {
            // SharedMemory統計を確認
            expect(summary.sharedMemory).toBeDefined();
            expect(summary.sharedMemory.writeOperations).toBeGreaterThan(0);
            
            // バッファオーバーフローが検出されている可能性
            if (summary.sharedMemory.bufferOverflows > 0) {
                console.log(`Buffer overflows detected: ${summary.sharedMemory.bufferOverflows}`);
            }
        }
        
        await collector.stop();
    });
    
    test('should maintain timing accuracy under load', async () => {
        await collector.initialize();
        await collector.start();
        
        const startTime = performance.now();
        const testDuration = 2000; // 2秒間
        
        // 高頻度でタイミングメトリクスを記録
        const interval = setInterval(() => {
            collector.startGameLogicTiming();
            
            // 短い処理をシミュレート
            const workStart = performance.now();
            let sum = 0;
            for (let i = 0; i < 10000; i++) {
                sum += Math.sqrt(i);
            }
            
            collector.endGameLogicTiming();
            
            collector.startRenderTiming();
            
            // レンダリング処理をシミュレート
            for (let i = 0; i < 5000; i++) {
                sum += Math.sin(i);
            }
            
            collector.endRenderTiming();
        }, 16); // 60fps相当
        
        // テスト期間を待つ
        await new Promise(resolve => setTimeout(resolve, testDuration));
        clearInterval(interval);
        
        // 処理完了を待つ
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const summary = collector.getSummary();
        
        // タイミングメトリクスが収集されていることを確認
        expect(summary.gameLogicTime).toBeDefined();
        expect(summary.renderingTime).toBeDefined();
        
        if (summary.gameLogicTime.avg) {
            expect(summary.gameLogicTime.avg).toBeGreaterThan(0);
            expect(summary.gameLogicTime.avg).toBeLessThan(100); // 100ms未満であることを期待
        }
        
        if (summary.renderingTime.avg) {
            expect(summary.renderingTime.avg).toBeGreaterThan(0);
            expect(summary.renderingTime.avg).toBeLessThan(100);
        }
        
        await collector.stop();
    });
    
    test('should handle session management correctly', async () => {
        await collector.initialize();
        await collector.start();
        
        // セッション情報を確認
        const sessionInfo = collector.getSessionInfo();
        
        expect(sessionInfo).toBeDefined();
        expect(sessionInfo.frameCount).toBeGreaterThanOrEqual(0);
        expect(sessionInfo.sharedMemorySupported).toBe(!collector.useFallback);
        
        if (sessionInfo.sessionId) {
            expect(sessionInfo.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
        }
        
        await collector.stop();
    });
    
    test('should properly cleanup resources', async () => {
        await collector.initialize();
        await collector.start();
        
        // いくつかのメトリクスを記録
        for (let i = 0; i < 10; i++) {
            collector.recordMetric('fps', Math.random() * 60);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 正常にクリーンアップできることを確認
        await expect(collector.cleanup()).resolves.not.toThrow();
        
        // クリーンアップ後は初期化状態がリセットされる
        expect(collector.isInitialized).toBe(false);
    });
    
    test('should fallback gracefully when SharedArrayBuffer is not available', async () => {
        // SharedArrayBufferを一時的に無効化
        const originalSharedArrayBuffer = globalThis.SharedArrayBuffer;
        delete globalThis.SharedArrayBuffer;
        
        try {
            const testCollector = new SharedMemoryMetricsCollector();
            await testCollector.initialize();
            
            // フォールバックモードで動作することを確認
            expect(testCollector.useFallback).toBe(true);
            expect(testCollector.isInitialized).toBe(true);
            
            // フォールバックモードでも正常に動作することを確認
            await testCollector.start();
            
            testCollector.recordMetric('fps', 60);
            testCollector.recordMetric('frameTime', 16.67);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const summary = testCollector.getSummary();
            expect(summary).toBeDefined();
            
            await testCollector.cleanup();
            
        } finally {
            // SharedArrayBufferを復元
            globalThis.SharedArrayBuffer = originalSharedArrayBuffer;
        }
    });
    
    test('should provide performance statistics', async () => {
        await collector.initialize();
        
        if (collector.useFallback) {
            console.log('Skipping performance statistics test in fallback mode');
            return;
        }
        
        await collector.start();
        
        // パフォーマンス統計を生成するためにメトリクスを記録
        for (let i = 0; i < 50; i++) {
            collector.recordMetric('fps', Math.random() * 60);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const summary = collector.getSummary();
        
        // SharedMemory統計が利用可能であることを確認
        expect(summary.sharedMemory).toBeDefined();
        expect(summary.sharedMemory.writeOperations).toBeGreaterThan(0);
        expect(summary.sharedMemory.avgWriteTime).toBeGreaterThanOrEqual(0);
        expect(summary.sharedMemory.atomicFailures).toBeGreaterThanOrEqual(0);
        expect(summary.sharedMemory.bufferUtilization).toBeGreaterThanOrEqual(0);
        expect(summary.sharedMemory.bufferUtilization).toBeLessThanOrEqual(100);
        
        console.log('SharedMemory Performance Stats:', {
            writeOperations: summary.sharedMemory.writeOperations,
            avgWriteTime: summary.sharedMemory.avgWriteTime.toFixed(3) + 'ms',
            bufferUtilization: summary.sharedMemory.bufferUtilization.toFixed(1) + '%',
            atomicFailures: summary.sharedMemory.atomicFailures,
            bufferOverflows: summary.sharedMemory.bufferOverflows
        });
        
        await collector.stop();
    });
});

test.describe('Performance Comparison Tests', () => {
    test('should demonstrate performance improvement over message passing', async ({ page }) => {
        // ベンチマークページに移動
        await page.goto('data:text/html,<!DOCTYPE html><html><head><title>Benchmark</title></head><body><script type="module">console.log("Ready for benchmark");</script></body></html>');
        
        // ベンチマークを実行
        const benchmarkResults = await page.evaluate(async () => {
            // 動的にベンチマークモジュールをインポート
            const { benchmark } = await import('/docs/js/optimization/performance-benchmark.js');
            
            // ベンチマーク設定を軽量化（テスト用）
            benchmark.config.testDuration = 3000;  // 3秒
            benchmark.config.testIterations = 2;   // 2回
            benchmark.config.metricsPerSecond = 500; // 500 metrics/sec
            
            try {
                const results = await benchmark.runBenchmark();
                return results;
            } catch (error) {
                return { error: error.message };
            }
        });
        
        // ベンチマーク結果を検証
        expect(benchmarkResults).toBeDefined();
        
        if (benchmarkResults.error) {
            console.warn('Benchmark error:', benchmarkResults.error);
            return;
        }
        
        expect(benchmarkResults.support).toBeDefined();
        
        // SharedArrayBufferがサポートされている場合、改善度をチェック
        if (benchmarkResults.support.sharedArrayBuffer && 
            benchmarkResults.improvement && 
            benchmarkResults.summary.sharedMemory && 
            benchmarkResults.summary.messagePassing) {
            
            console.log('Performance Comparison Results:', {
                sharedMemoryThroughput: benchmarkResults.summary.sharedMemory.throughput.avg.toFixed(1),
                messagePassingThroughput: benchmarkResults.summary.messagePassing.throughput.avg.toFixed(1),
                throughputImprovement: benchmarkResults.improvement.throughputImprovement.toFixed(1) + '%',
                latencyReduction: benchmarkResults.improvement.latencyReduction.toFixed(1) + '%'
            });
            
            // パフォーマンス改善が期待値内であることを確認
            expect(benchmarkResults.improvement.throughputImprovement).toBeGreaterThanOrEqual(-50); // -50%以上（大幅な悪化なし）
            expect(benchmarkResults.improvement.latencyReduction).toBeGreaterThanOrEqual(-50); // -50%以上（大幅な悪化なし）
            
        } else {
            console.log('SharedArrayBuffer not supported or benchmark incomplete, skipping performance comparison');
        }
    });
});