/**
 * CSP (Content Security Policy) Reporter
 * CSP違反をキャプチャして開発者コンソールに記録
 */

(function() {
    'use strict';
    
    // CSP違反イベントをリッスン
    document.addEventListener('securitypolicyviolation', function(event) {
        console.group('🚨 CSP Violation Detected');
        console.error('Directive:', event.violatedDirective);
        console.error('Blocked URI:', event.blockedURI);
        console.error('Source File:', event.sourceFile);
        console.error('Line Number:', event.lineNumber);
        console.error('Column Number:', event.columnNumber);
        console.error('Original Policy:', event.originalPolicy);
        console.groupEnd();
        
        // 違反を集計
        if (!window.cspViolations) {
            window.cspViolations = {};
        }
        
        const key = `${event.violatedDirective}|${event.blockedURI}`;
        window.cspViolations[key] = (window.cspViolations[key] || 0) + 1;
        
        // 開発環境では違反を視覚的に表示
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showCSPViolationNotification(event);
        }
    });
    
    /**
     * CSP違反を視覚的に通知
     */
    function showCSPViolationNotification(event) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            font-family: monospace;
            font-size: 12px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <strong>CSP Violation!</strong><br>
            ${event.violatedDirective}<br>
            ${event.blockedURI}
        `;
        
        document.body.appendChild(notification);
        
        // 5秒後に自動で消去
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    // CSP違反サマリーを取得する関数
    window.getCSPViolationSummary = function() {
        if (!window.cspViolations || Object.keys(window.cspViolations).length === 0) {
            console.log('✅ No CSP violations detected');
            return;
        }
        
        console.group('📊 CSP Violation Summary');
        Object.entries(window.cspViolations)
            .sort((a, b) => b[1] - a[1])
            .forEach(([key, count]) => {
                const [directive, uri] = key.split('|');
                console.log(`${count}x: ${directive} - ${uri}`);
            });
        console.groupEnd();
    };
    
    // アニメーション用のCSS追加
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('🛡️ CSP Reporter initialized. Use getCSPViolationSummary() to see violations.');
})();