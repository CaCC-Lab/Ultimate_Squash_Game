/**
 * CSP Enforcing Mode Migration Tool
 * Report-OnlyモードからEnforcingモードへの安全な移行
 */

export class CSPEnforcingMigration {
    constructor() {
        this.config = {
            // 移行前の評価期間（ミリ秒）
            evaluationPeriod: 30000, // 30秒 (本来は1週間程度)
            // 許容される違反数
            maxAllowedViolations: 5,
            // 重要な違反のしきい値
            criticalViolationThreshold: 1,
            // 自動移行の有効/無効
            autoMigrationEnabled: false
        };
        
        this.state = {
            isEvaluating: false,
            evaluationStartTime: null,
            violationHistory: [],
            migrationReadiness: null,
            enforcingModeActive: false
        };
        
        this.criticalDirectives = [
            'script-src',
            'object-src',
            'frame-src',
            'base-uri'
        ];
        
        this.bindMethods();
        this.initializeCSPEvaluation();
    }
    
    bindMethods() {
        this.onCSPViolation = this.onCSPViolation.bind(this);
        this.evaluateViolations = this.evaluateViolations.bind(this);
    }
    
    /**
     * CSP評価システムの初期化
     */
    initializeCSPEvaluation() {
        // 既存のCSP違反リスナーを拡張
        if (typeof window.getCSPViolationSummary === 'function') {
            this.integrateWithExistingReporter();
        }
        
        // 独自の違反リスナーを追加
        document.addEventListener('securitypolicyviolation', this.onCSPViolation);
        
        // 評価開始
        this.startEvaluation();
        
        console.log('🛡️ [CSP Migration] Evaluation system initialized');
    }
    
    /**
     * 既存のCSPレポーターとの統合
     */
    integrateWithExistingReporter() {
        // window.cspViolationsが存在する場合、それを活用
        if (window.cspViolations) {
            // 既存の違反データを取り込み
            Object.entries(window.cspViolations).forEach(([key, count]) => {
                const [directive, uri] = key.split('|');
                this.state.violationHistory.push({
                    timestamp: Date.now(),
                    directive: directive,
                    blockedURI: uri,
                    count: count,
                    source: 'existing'
                });
            });
            
            console.log(`🛡️ [CSP Migration] Imported ${this.state.violationHistory.length} existing violations`);
        }
    }
    
    /**
     * 評価開始
     */
    startEvaluation() {
        if (this.state.isEvaluating) {
            console.warn('[CSP Migration] Evaluation already in progress');
            return;
        }
        
        this.state.isEvaluating = true;
        this.state.evaluationStartTime = Date.now();
        this.state.violationHistory = [];
        
        console.log('🔍 [CSP Migration] Starting CSP violation evaluation');
        
        // 評価期間終了後の自動評価
        setTimeout(() => {
            this.completeEvaluation();
        }, this.config.evaluationPeriod);
    }
    
    /**
     * CSP違反イベントハンドラー
     */
    onCSPViolation(event) {
        if (!this.state.isEvaluating) return;
        
        const violation = {
            timestamp: Date.now(),
            directive: event.violatedDirective,
            blockedURI: event.blockedURI,
            sourceFile: event.sourceFile,
            lineNumber: event.lineNumber,
            originalPolicy: event.originalPolicy,
            isCritical: this.isCriticalViolation(event.violatedDirective)
        };
        
        this.state.violationHistory.push(violation);
        
        console.log('🚨 [CSP Migration] Violation recorded:', {
            directive: violation.directive,
            blockedURI: violation.blockedURI,
            isCritical: violation.isCritical
        });
        
        // リアルタイム評価更新
        this.updateMigrationReadiness();
    }
    
    /**
     * 重要な違反かどうかを判定
     */
    isCriticalViolation(directive) {
        return this.criticalDirectives.some(critical => 
            directive.includes(critical)
        );
    }
    
    /**
     * 移行準備状況の更新
     */
    updateMigrationReadiness() {
        const violations = this.state.violationHistory;
        const criticalViolations = violations.filter(v => v.isCritical);
        const totalViolations = violations.length;
        
        this.state.migrationReadiness = {
            totalViolations: totalViolations,
            criticalViolations: criticalViolations.length,
            isReady: (
                totalViolations <= this.config.maxAllowedViolations &&
                criticalViolations.length <= this.config.criticalViolationThreshold
            ),
            riskLevel: this.calculateRiskLevel(totalViolations, criticalViolations.length),
            evaluatedAt: Date.now()
        };
    }
    
    /**
     * リスクレベル計算
     */
    calculateRiskLevel(totalViolations, criticalViolations) {
        if (criticalViolations > 0) return 'HIGH';
        if (totalViolations > this.config.maxAllowedViolations) return 'MEDIUM';
        if (totalViolations > 0) return 'LOW';
        return 'MINIMAL';
    }
    
    /**
     * 評価完了
     */
    completeEvaluation() {
        if (!this.state.isEvaluating) return;
        
        this.state.isEvaluating = false;
        this.updateMigrationReadiness();
        
        const readiness = this.state.migrationReadiness;
        
        console.group('📊 [CSP Migration] Evaluation Complete');
        console.log('Total Violations:', readiness.totalViolations);
        console.log('Critical Violations:', readiness.criticalViolations);
        console.log('Risk Level:', readiness.riskLevel);
        console.log('Ready for Enforcing Mode:', readiness.isReady);
        console.groupEnd();
        
        // 自動移行の実行
        if (readiness.isReady && this.config.autoMigrationEnabled) {
            this.migrateToEnforcingMode();
        } else {
            this.generateMigrationReport();
        }
    }
    
    /**
     * Enforcingモードへの移行実行
     */
    async migrateToEnforcingMode() {
        if (this.state.enforcingModeActive) {
            console.warn('[CSP Migration] Enforcing mode already active');
            return;
        }
        
        try {
            console.log('🔒 [CSP Migration] Migrating to Enforcing Mode...');
            
            // 設定ファイルの更新
            await this.updateCSPConfiguration();
            
            // ページのリロード（新しいCSPを適用）
            this.applyEnforcingCSP();
            
            this.state.enforcingModeActive = true;
            
            console.log('✅ [CSP Migration] Migration to Enforcing Mode completed');
            
            // 移行完了通知
            this.notifyMigrationComplete();
            
        } catch (error) {
            console.error('❌ [CSP Migration] Migration failed:', error);
            this.handleMigrationFailure(error);
        }
    }
    
    /**
     * CSP設定の更新
     */
    async updateCSPConfiguration() {
        // ConfigLoaderを使用して設定を更新
        if (window.configLoader && window.configLoader.config) {
            const config = window.configLoader.config;
            
            if (config.security && config.security.csp) {
                // Report-OnlyをEnforcingに変更
                config.security.csp.reportOnly = false;
                
                console.log('🔧 [CSP Migration] Configuration updated');
            }
        }
    }
    
    /**
     * Enforcing CSPをページに適用
     */
    applyEnforcingCSP() {
        // 新しいメタタグでEnforcing CSPを設定
        const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingMeta) {
            existingMeta.remove();
        }
        
        const meta = document.createElement('meta');
        meta.setAttribute('http-equiv', 'Content-Security-Policy');
        meta.setAttribute('content', this.generateEnforcingCSPContent());
        
        document.head.appendChild(meta);
        
        console.log('🛡️ [CSP Migration] Enforcing CSP applied');
    }
    
    /**
     * Enforcing CSPコンテンツ生成
     */
    generateEnforcingCSPContent() {
        const directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:*",
            "worker-src 'self' blob:",
            "child-src 'self' blob:",
            "object-src 'none'",
            "font-src 'self'",
            "base-uri 'self'",
            "form-action 'self'"
        ];
        
        return directives.join('; ');
    }
    
    /**
     * 移行レポート生成
     */
    generateMigrationReport() {
        const readiness = this.state.migrationReadiness;
        const violations = this.state.violationHistory;
        
        const report = {
            evaluationPeriod: {
                start: this.state.evaluationStartTime,
                end: Date.now(),
                duration: Date.now() - this.state.evaluationStartTime
            },
            violationSummary: {
                total: readiness.totalViolations,
                critical: readiness.criticalViolations,
                riskLevel: readiness.riskLevel
            },
            readiness: {
                isReady: readiness.isReady,
                recommendation: this.generateRecommendation(readiness)
            },
            violationDetails: this.groupViolationsByDirective(violations),
            nextSteps: this.generateNextSteps(readiness)
        };
        
        console.group('📋 [CSP Migration] Report');
        console.log('Migration Readiness:', report.readiness);
        console.log('Violation Summary:', report.violationSummary);
        console.log('Violation Details:', report.violationDetails);
        console.log('Next Steps:', report.nextSteps);
        console.groupEnd();
        
        // IndexedDBに保存
        this.saveMigrationReport(report);
        
        return report;
    }
    
    /**
     * 違反をディレクティブ別にグループ化
     */
    groupViolationsByDirective(violations) {
        const grouped = {};
        
        violations.forEach(violation => {
            const directive = violation.directive;
            
            if (!grouped[directive]) {
                grouped[directive] = {
                    count: 0,
                    examples: [],
                    isCritical: violation.isCritical
                };
            }
            
            grouped[directive].count += violation.count || 1;
            
            if (grouped[directive].examples.length < 3) {
                grouped[directive].examples.push({
                    blockedURI: violation.blockedURI,
                    sourceFile: violation.sourceFile,
                    lineNumber: violation.lineNumber
                });
            }
        });
        
        return grouped;
    }
    
    /**
     * 推奨事項生成
     */
    generateRecommendation(readiness) {
        if (readiness.isReady) {
            return 'CSP Enforcing mode can be safely enabled. No critical violations detected.';
        }
        
        if (readiness.criticalViolations > 0) {
            return 'Critical violations detected. Review and fix security issues before enabling Enforcing mode.';
        }
        
        if (readiness.totalViolations > this.config.maxAllowedViolations) {
            return 'Too many violations detected. Review and optimize CSP directives or fix violations.';
        }
        
        return 'Continue monitoring. Consider extending evaluation period.';
    }
    
    /**
     * 次のステップ生成
     */
    generateNextSteps(readiness) {
        const steps = [];
        
        if (readiness.isReady) {
            steps.push('Enable CSP Enforcing mode');
            steps.push('Monitor for any new violations');
            steps.push('Consider implementing CSP nonces for enhanced security');
        } else {
            if (readiness.criticalViolations > 0) {
                steps.push('Fix critical security violations immediately');
            }
            
            if (readiness.totalViolations > this.config.maxAllowedViolations) {
                steps.push('Review and update CSP directives');
                steps.push('Fix non-critical violations');
            }
            
            steps.push('Continue evaluation period');
            steps.push('Re-evaluate after fixes are implemented');
        }
        
        return steps;
    }
    
    /**
     * 移行完了通知
     */
    notifyMigrationComplete() {
        // ダッシュボードに通知
        if (window.performanceDashboard && window.performanceDashboard.isVisible) {
            this.addNotificationToDashboard('CSP Enforcing Mode Activated', 'success');
        }
        
        // コンソール通知
        console.log('🎉 [CSP Migration] Migration completed successfully!');
        
        // カスタムイベント発火
        const event = new CustomEvent('csp:enforcingModeActivated', {
            detail: {
                timestamp: Date.now(),
                migrationReadiness: this.state.migrationReadiness
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * 移行失敗処理
     */
    handleMigrationFailure(error) {
        console.error('🚨 [CSP Migration] Migration failed:', error);
        
        // Report-Onlyモードに戻す
        this.revertToReportOnly();
        
        // エラー通知
        if (window.performanceDashboard && window.performanceDashboard.isVisible) {
            this.addNotificationToDashboard('CSP Migration Failed', 'error');
        }
    }
    
    /**
     * Report-Onlyモードへの復帰
     */
    revertToReportOnly() {
        const enforcingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (enforcingMeta) {
            enforcingMeta.remove();
        }
        
        this.state.enforcingModeActive = false;
        
        console.log('🔄 [CSP Migration] Reverted to Report-Only mode');
    }
    
    /**
     * ダッシュボードに通知追加
     */
    addNotificationToDashboard(message, type) {
        // パフォーマンスダッシュボードに通知を追加
        // この実装は既存のダッシュボード構造に依存
        console.log(`📢 [CSP Migration] Dashboard notification: ${message} (${type})`);
    }
    
    /**
     * 移行レポートをIndexedDBに保存
     */
    async saveMigrationReport(report) {
        try {
            if (!window.indexedDB) return;
            
            const request = indexedDB.open('CSPMigrationReports', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('reports')) {
                    const store = db.createObjectStore('reports', { keyPath: 'timestamp' });
                    store.createIndex('riskLevel', 'violationSummary.riskLevel', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['reports'], 'readwrite');
                const store = transaction.objectStore('reports');
                
                const reportWithTimestamp = {
                    ...report,
                    timestamp: Date.now()
                };
                
                store.add(reportWithTimestamp);
                
                console.log('💾 [CSP Migration] Report saved to IndexedDB');
            };
            
        } catch (error) {
            console.warn('[CSP Migration] Failed to save report:', error);
        }
    }
    
    /**
     * 手動移行トリガー
     */
    forceMigration() {
        console.log('🔧 [CSP Migration] Force migration triggered');
        this.migrateToEnforcingMode();
    }
    
    /**
     * 評価状況取得
     */
    getEvaluationStatus() {
        return {
            isEvaluating: this.state.isEvaluating,
            evaluationStartTime: this.state.evaluationStartTime,
            violationCount: this.state.violationHistory.length,
            migrationReadiness: this.state.migrationReadiness,
            enforcingModeActive: this.state.enforcingModeActive
        };
    }
    
    /**
     * 設定更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ [CSP Migration] Configuration updated:', this.config);
    }
    
    /**
     * リソースクリーンアップ
     */
    destroy() {
        document.removeEventListener('securitypolicyviolation', this.onCSPViolation);
        this.state.isEvaluating = false;
        this.state.violationHistory = [];
        
        console.log('🧹 [CSP Migration] Cleanup completed');
    }
}

// グローバルインスタンス作成
window.cspMigration = new CSPEnforcingMigration();

// 開発環境では自動移行を有効化
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.cspMigration.updateConfig({
        evaluationPeriod: 10000, // 10秒
        autoMigrationEnabled: true
    });
    
    console.log('🛡️ [CSP Migration] Development mode: Auto-migration enabled');
}

export default CSPEnforcingMigration;"