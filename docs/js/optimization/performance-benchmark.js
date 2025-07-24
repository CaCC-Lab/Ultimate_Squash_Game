/**
 * SharedArrayBuffer vs Message Passing Performance Benchmark
 * SharedArrayBuffer + Atomicsの性能改善を定量的に測定
 */

import { SharedMemoryMetricsCollector } from './shared-memory-metrics-collector.js';
import { PerformanceMetricsCollector } from './performance-metrics-collector.js';

export class PerformanceBenchmark {
    constructor() {
        this.config = {
            testDuration: 10000,        // 10秒間のテスト
            metricsPerSecond: 1000,     // 1秒間に1000回のメトリクス書き込み
            testIterations: 3,          // テストの繰り返し回数
            warmupDuration: 2000,       // ウォームアップ時間
            cooldownDuration: 1000      // クールダウン時間
        };
        
        this.results = {
            sharedMemory: {
                throughput: [],
                latency: [],
                cpuUsage: [],
                memoryUsage: [],
                errors: []
            },
            messagePassing: {
                throughput: [],
                latency: [],
                cpuUsage: [],
                memoryUsage: [],
                errors: []
            }
        };
    }
    
    /**
     * ベンチマーク実行
     */
    async runBenchmark() {
        console.log('🚀 Performance Benchmark開始');
        console.log(`テスト設定: ${this.config.testDuration}ms間, ${this.config.metricsPerSecond} metrics/sec, ${this.config.testIterations}回実行`);
        
        // ブラウザサポートチェック
        const support = this.checkBrowserSupport();
        console.log('ブラウザサポート状況:', support);
        
        // 各実装をテスト
        for (let i = 0; i < this.config.testIterations; i++) {
            console.log(`\n--- テストイテレーション ${i + 1}/${this.config.testIterations} ---`);
            
            // SharedArrayBuffer実装のテスト
            if (support.sharedArrayBuffer) {
                await this.testSharedMemoryImplementation(i);
                await this.wait(this.config.cooldownDuration);
            }
            
            // Message Passing実装のテスト
            await this.testMessagePassingImplementation(i);
            await this.wait(this.config.cooldownDuration);
        }
        
        // 結果の分析と表示
        const analysis = this.analyzeResults();
        this.displayResults(analysis);
        
        return analysis;
    }
    
    /**
     * ブラウザサポートチェック
     */
    checkBrowserSupport() {
        return {
            sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
            atomics: typeof Atomics !== 'undefined',
            webWorkers: typeof Worker !== 'undefined',
            performanceMemory: !!performance.memory,
            performanceObserver: typeof PerformanceObserver !== 'undefined'
        };
    }
    
    /**
     * SharedMemory実装のテスト
     */
    async testSharedMemoryImplementation(iteration) {
        console.log('🧠 SharedArrayBuffer + Atomicsテスト開始');
        
        const collector = new SharedMemoryMetricsCollector();
        const metrics = {
            startTime: 0,
            endTime: 0,
            totalMetrics: 0,
            errors: 0,
            latencies: [],
            memorySnapshots: []
        };
        
        try {
            // 初期化
            await collector.initialize();
            await this.wait(500); // 初期化完了待ち
            
            // ウォームアップ
            console.log('  ウォームアップ中...');
            await this.warmup(collector);
            
            // メモリ使用量測定開始
            const memoryMonitor = this.startMemoryMonitoring(metrics);
            
            // ベンチマーク実行
            console.log('  ベンチマーク実行中...');
            metrics.startTime = performance.now();
            
            const benchmarkTask = this.runMetricsWriteBenchmark(collector, metrics);
            await Promise.race([
                benchmarkTask,
                this.wait(this.config.testDuration + 5000) // タイムアウト保護
            ]);
            
            metrics.endTime = performance.now();
            
            // メモリ監視停止
            clearInterval(memoryMonitor);
            
            // 結果を記録
            this.recordSharedMemoryResults(metrics, iteration);
            
        } catch (error) {
            console.error('SharedMemory test error:', error);
            this.results.sharedMemory.errors.push({
                iteration,
                error: error.message,
                timestamp: Date.now()
            });
        } finally {
            await collector.cleanup();
        }
    }
    
    /**
     * Message Passing実装のテスト
     */
    async testMessagePassingImplementation(iteration) {
        console.log('📨 Message Passingテスト開始');
        
        const collector = new PerformanceMetricsCollector();
        const metrics = {
            startTime: 0,
            endTime: 0,
            totalMetrics: 0,
            errors: 0,
            latencies: [],
            memorySnapshots: []
        };
        
        try {
            // 初期化
            await collector.initializeWorker();
            await this.wait(500); // 初期化完了待ち
            
            // ウォームアップ
            console.log('  ウォームアップ中...');
            await this.warmup(collector);
            
            // メモリ使用量測定開始
            const memoryMonitor = this.startMemoryMonitoring(metrics);
            
            // ベンチマーク実行
            console.log('  ベンチマーク実行中...');
            metrics.startTime = performance.now();
            
            const benchmarkTask = this.runMetricsWriteBenchmark(collector, metrics);
            await Promise.race([
                benchmarkTask,
                this.wait(this.config.testDuration + 5000) // タイムアウト保護
            ]);
            
            metrics.endTime = performance.now();
            
            // メモリ監視停止
            clearInterval(memoryMonitor);
            
            // 結果を記録
            this.recordMessagePassingResults(metrics, iteration);
            
        } catch (error) {
            console.error('MessagePassing test error:', error);
            this.results.messagePassing.errors.push({
                iteration,
                error: error.message,
                timestamp: Date.now()
            });
        } finally {
            await collector.cleanup();
        }
    }
    
    /**
     * メトリクス書き込みベンチマーク
     */
    async runMetricsWriteBenchmark(collector, metrics) {
        const interval = 1000 / this.config.metricsPerSecond; // ms
        const totalMetrics = (this.config.testDuration / 1000) * this.config.metricsPerSecond;
        
        let writeCount = 0;
        const metricTypes = ['fps', 'frameTime', 'memory', 'gameLogic', 'rendering', 'input'];
        
        const writeMetric = () => {
            if (writeCount >= totalMetrics) {
                return;
            }
            
            const startTime = performance.now();
            const metricType = metricTypes[writeCount % metricTypes.length];
            const value = Math.random() * 100;
            
            try {
                collector.recordMetric(metricType, value);
                
                const endTime = performance.now();
                const latency = endTime - startTime;
                metrics.latencies.push(latency);
                metrics.totalMetrics++;
                
            } catch (error) {
                metrics.errors++;
                console.warn('Metric write error:', error);
            }
            
            writeCount++;
            
            // 次の書き込みをスケジュール
            setTimeout(writeMetric, interval);
        };
        
        // 書き込み開始
        writeMetric();
        
        // 完了まで待機
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (writeCount >= totalMetrics || 
                    performance.now() - metrics.startTime >= this.config.testDuration) {
                    resolve();
                } else {
                    setTimeout(checkCompletion, 100);
                }
            };
            checkCompletion();
        });
    }
    
    /**
     * ウォームアップ
     */
    async warmup(collector) {
        const warmupMetrics = Math.floor(this.config.warmupDuration / 10);
        
        for (let i = 0; i < warmupMetrics; i++) {
            collector.recordMetric('fps', Math.random() * 60);
            await this.wait(10);
        }
    }
    
    /**
     * メモリ使用量監視開始
     */
    startMemoryMonitoring(metrics) {
        return setInterval(() => {
            if (performance.memory) {
                metrics.memorySnapshots.push({
                    timestamp: performance.now(),
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    usedJSHeapSizeMB: performance.memory.usedJSHeapSize / 1048576
                });
            }
        }, 250);
    }
    
    /**
     * SharedMemory結果の記録
     */
    recordSharedMemoryResults(metrics, iteration) {
        const duration = metrics.endTime - metrics.startTime;
        const throughput = (metrics.totalMetrics / duration) * 1000; // metrics/sec
        const avgLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
        const p95Latency = this.calculatePercentile(metrics.latencies, 95);
        const avgMemory = this.calculateAverageMemory(metrics.memorySnapshots);
        
        this.results.sharedMemory.throughput.push(throughput);
        this.results.sharedMemory.latency.push({
            avg: avgLatency,
            p95: p95Latency,
            samples: metrics.latencies.length
        });
        this.results.sharedMemory.memoryUsage.push(avgMemory);
        
        console.log(`  結果: ${throughput.toFixed(1)} metrics/sec, 平均遅延: ${avgLatency.toFixed(3)}ms, P95: ${p95Latency.toFixed(3)}ms`);
    }
    
    /**
     * MessagePassing結果の記録
     */
    recordMessagePassingResults(metrics, iteration) {
        const duration = metrics.endTime - metrics.startTime;
        const throughput = (metrics.totalMetrics / duration) * 1000; // metrics/sec
        const avgLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
        const p95Latency = this.calculatePercentile(metrics.latencies, 95);
        const avgMemory = this.calculateAverageMemory(metrics.memorySnapshots);
        
        this.results.messagePassing.throughput.push(throughput);
        this.results.messagePassing.latency.push({
            avg: avgLatency,
            p95: p95Latency,
            samples: metrics.latencies.length
        });
        this.results.messagePassing.memoryUsage.push(avgMemory);
        
        console.log(`  結果: ${throughput.toFixed(1)} metrics/sec, 平均遅延: ${avgLatency.toFixed(3)}ms, P95: ${p95Latency.toFixed(3)}ms`);
    }
    
    /**
     * パーセンタイル計算
     */
    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        
        if (lower === upper) {
            return sorted[lower];
        }
        
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    
    /**
     * 平均メモリ使用量計算
     */
    calculateAverageMemory(snapshots) {
        if (snapshots.length === 0) return 0;
        
        const sum = snapshots.reduce((total, snapshot) => total + snapshot.usedJSHeapSizeMB, 0);
        return sum / snapshots.length;
    }
    
    /**
     * 結果分析
     */
    analyzeResults() {
        const analysis = {
            support: this.checkBrowserSupport(),
            summary: {},
            improvement: {},
            recommendations: []
        };
        
        // SharedMemory結果の統計
        if (this.results.sharedMemory.throughput.length > 0) {
            analysis.summary.sharedMemory = {
                throughput: {
                    avg: this.average(this.results.sharedMemory.throughput),
                    min: Math.min(...this.results.sharedMemory.throughput),
                    max: Math.max(...this.results.sharedMemory.throughput)
                },
                latency: {
                    avg: this.average(this.results.sharedMemory.latency.map(l => l.avg)),
                    p95: this.average(this.results.sharedMemory.latency.map(l => l.p95))
                },
                memory: {
                    avg: this.average(this.results.sharedMemory.memoryUsage)
                },
                errors: this.results.sharedMemory.errors.length
            };
        }
        
        // MessagePassing結果の統計
        if (this.results.messagePassing.throughput.length > 0) {
            analysis.summary.messagePassing = {
                throughput: {
                    avg: this.average(this.results.messagePassing.throughput),
                    min: Math.min(...this.results.messagePassing.throughput),
                    max: Math.max(...this.results.messagePassing.throughput)
                },
                latency: {
                    avg: this.average(this.results.messagePassing.latency.map(l => l.avg)),
                    p95: this.average(this.results.messagePassing.latency.map(l => l.p95))
                },
                memory: {
                    avg: this.average(this.results.messagePassing.memoryUsage)
                },
                errors: this.results.messagePassing.errors.length
            };
        }
        
        // 改善度の計算
        if (analysis.summary.sharedMemory && analysis.summary.messagePassing) {
            const smThroughput = analysis.summary.sharedMemory.throughput.avg;
            const mpThroughput = analysis.summary.messagePassing.throughput.avg;
            const smLatency = analysis.summary.sharedMemory.latency.avg;
            const mpLatency = analysis.summary.messagePassing.latency.avg;
            
            analysis.improvement = {
                throughputImprovement: ((smThroughput - mpThroughput) / mpThroughput) * 100,
                latencyReduction: ((mpLatency - smLatency) / mpLatency) * 100,
                recommendSharedMemory: smThroughput > mpThroughput && smLatency < mpLatency
            };
        }
        
        // 推奨事項
        this.generateRecommendations(analysis);
        
        return analysis;
    }
    
    /**
     * 推奨事項の生成
     */
    generateRecommendations(analysis) {
        if (!analysis.support.sharedArrayBuffer) {
            analysis.recommendations.push({
                type: 'warning',
                message: 'SharedArrayBufferがサポートされていません。Cross-Origin-Embedder-Policy & Cross-Origin-Opener-Policy設定が必要です。'
            });
        }
        
        if (analysis.improvement.throughputImprovement > 10) {
            analysis.recommendations.push({
                type: 'success',
                message: `SharedArrayBuffer使用により${analysis.improvement.throughputImprovement.toFixed(1)}%のスループット向上が期待できます。`
            });
        }
        
        if (analysis.improvement.latencyReduction > 20) {
            analysis.recommendations.push({
                type: 'success',
                message: `SharedArrayBuffer使用により${analysis.improvement.latencyReduction.toFixed(1)}%の遅延改善が期待できます。`
            });
        }
        
        if (analysis.summary.sharedMemory?.errors > 0) {
            analysis.recommendations.push({
                type: 'warning',
                message: `SharedMemory実装で${analysis.summary.sharedMemory.errors}件のエラーが発生しました。安定性の確認が必要です。`
            });
        }
    }
    
    /**
     * 結果表示
     */
    displayResults(analysis) {
        console.log('\n📊 ベンチマーク結果');
        console.log('==================');
        
        // ブラウザサポート
        console.log('\n🌐 ブラウザサポート:');
        Object.entries(analysis.support).forEach(([feature, supported]) => {
            console.log(`  ${feature}: ${supported ? '✅' : '❌'}`);
        });
        
        // パフォーマンス比較
        if (analysis.summary.sharedMemory && analysis.summary.messagePassing) {
            console.log('\n⚡ パフォーマンス比較:');
            console.log('  SharedArrayBuffer:');
            console.log(`    スループット: ${analysis.summary.sharedMemory.throughput.avg.toFixed(1)} metrics/sec`);
            console.log(`    平均遅延: ${analysis.summary.sharedMemory.latency.avg.toFixed(3)}ms`);
            console.log(`    P95遅延: ${analysis.summary.sharedMemory.latency.p95.toFixed(3)}ms`);
            console.log(`    メモリ使用量: ${analysis.summary.sharedMemory.memory.avg.toFixed(1)}MB`);
            
            console.log('  Message Passing:');
            console.log(`    スループット: ${analysis.summary.messagePassing.throughput.avg.toFixed(1)} metrics/sec`);
            console.log(`    平均遅延: ${analysis.summary.messagePassing.latency.avg.toFixed(3)}ms`);
            console.log(`    P95遅延: ${analysis.summary.messagePassing.latency.p95.toFixed(3)}ms`);
            console.log(`    メモリ使用量: ${analysis.summary.messagePassing.memory.avg.toFixed(1)}MB`);
            
            console.log('\n📈 改善度:');
            console.log(`  スループット向上: ${analysis.improvement.throughputImprovement > 0 ? '+' : ''}${analysis.improvement.throughputImprovement.toFixed(1)}%`);
            console.log(`  遅延削減: ${analysis.improvement.latencyReduction > 0 ? '-' : ''}${analysis.improvement.latencyReduction.toFixed(1)}%`);
        }
        
        // 推奨事項
        if (analysis.recommendations.length > 0) {
            console.log('\n💡 推奨事項:');
            analysis.recommendations.forEach((rec, index) => {
                const icon = rec.type === 'success' ? '✅' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`  ${icon} ${rec.message}`);
            });
        }
        
        console.log('\n🎯 結論:');
        if (analysis.improvement.recommendSharedMemory) {
            console.log('  SharedArrayBuffer + Atomicsの使用を推奨します！');
        } else {
            console.log('  現在の環境では従来のMessage Passingが適切です。');
        }
    }
    
    /**
     * 平均値計算
     */
    average(numbers) {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
    
    /**
     * 待機ユーティリティ
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 結果のエクスポート
     */
    exportResults(analysis) {
        const exportData = {
            timestamp: new Date().toISOString(),
            config: this.config,
            results: this.results,
            analysis: analysis,
            environment: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                memory: performance.memory ? {
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    usedJSHeapSize: performance.memory.usedJSHeapSize
                } : null
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-benchmark_${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 使用例とエクスポート
export const benchmark = new PerformanceBenchmark();

// グローバルアクセス用
if (typeof window !== 'undefined') {
    window.PerformanceBenchmark = PerformanceBenchmark;
    window.performanceBenchmark = benchmark;
}