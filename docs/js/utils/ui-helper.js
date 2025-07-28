/**
 * UI Helper Utility
 * UI要素作成の重複コードを削減するユーティリティ
 */

class UIHelper {
    /**
     * スタイル付きのDOM要素を作成
     * @param {string} tagName - 要素のタグ名
     * @param {Object} options - 要素の設定オプション
     * @param {string} options.id - 要素のID
     * @param {string} options.className - 要素のクラス名
     * @param {string} options.innerHTML - 要素の内部HTML
     * @param {Object} options.style - スタイルオブジェクト
     * @param {string} options.cssText - CSSテキスト（styleより優先）
     * @param {Object} options.attributes - その他の属性
     * @param {Array} options.children - 子要素の配列
     * @param {Object} options.events - イベントリスナーのマップ
     * @returns {HTMLElement} 作成された要素
     */
    static createElement(tagName, options = {}) {
        const element = document.createElement(tagName);
        
        // 基本プロパティの設定
        if (options.id) element.id = options.id;
        if (options.className) element.className = options.className;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        
        // スタイルの設定
        if (options.cssText) {
            element.style.cssText = options.cssText;
        } else if (options.style) {
            Object.assign(element.style, options.style);
        }
        
        // 属性の設定
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        // イベントリスナーの設定
        if (options.events) {
            Object.entries(options.events).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
            });
        }
        
        // 子要素の追加
        if (options.children) {
            options.children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    }
    
    /**
     * 複数の要素を一度に作成
     * @param {Array} definitions - 要素定義の配列
     * @returns {Array} 作成された要素の配列
     */
    static createElements(definitions) {
        return definitions.map(def => 
            this.createElement(def.tag, def.options)
        );
    }
    
    /**
     * ポップアップ/通知要素を作成
     * @param {Object} options - 通知の設定
     * @returns {HTMLElement} 通知要素
     */
    static createNotification(options = {}) {
        const defaults = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '8px',
            zIndex: 9999,
            transition: 'all 0.3s ease',
            opacity: 0
        };
        
        const style = { ...defaults, ...options.style };
        
        return this.createElement('div', {
            className: 'notification ' + (options.className || ''),
            cssText: Object.entries(style)
                .map(([key, value]) => `${this.camelToKebab(key)}: ${value}`)
                .join('; '),
            innerHTML: options.message || '',
            attributes: options.attributes
        });
    }
    
    /**
     * モーダルダイアログを作成
     * @param {Object} options - モーダルの設定
     * @returns {Object} モーダル要素とオーバーレイ
     */
    static createModal(options = {}) {
        // オーバーレイ
        const overlay = this.createElement('div', {
            className: 'modal-overlay',
            cssText: `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `
        });
        
        // モーダルコンテンツ
        const modal = this.createElement('div', {
            className: 'modal-content ' + (options.className || ''),
            cssText: options.cssText || `
                background: white;
                border-radius: 10px;
                padding: 30px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `,
            innerHTML: options.content || ''
        });
        
        overlay.appendChild(modal);
        
        // クリックで閉じる機能
        if (options.closeOnOverlayClick !== false) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        }
        
        return { overlay, modal };
    }
    
    /**
     * ボタングループを作成
     * @param {Array} buttons - ボタン定義の配列
     * @param {Object} groupOptions - グループのオプション
     * @returns {HTMLElement} ボタングループ要素
     */
    static createButtonGroup(buttons, groupOptions = {}) {
        const group = this.createElement('div', {
            className: 'button-group ' + (groupOptions.className || ''),
            cssText: groupOptions.cssText || 'display: flex; gap: 10px;'
        });
        
        buttons.forEach(btnDef => {
            const button = this.createElement('button', {
                ...btnDef,
                className: 'btn ' + (btnDef.className || ''),
                cssText: btnDef.cssText || `
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `
            });
            group.appendChild(button);
        });
        
        return group;
    }
    
    /**
     * プログレスバーを作成
     * @param {Object} options - プログレスバーの設定
     * @returns {Object} プログレスバー要素とメソッド
     */
    static createProgressBar(options = {}) {
        const container = this.createElement('div', {
            className: 'progress-container ' + (options.className || ''),
            cssText: options.containerStyle || `
                width: 100%;
                height: 20px;
                background: #f0f0f0;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            `
        });
        
        const bar = this.createElement('div', {
            className: 'progress-bar',
            cssText: options.barStyle || `
                height: 100%;
                background: #4CAF50;
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 10px;
            `
        });
        
        container.appendChild(bar);
        
        return {
            element: container,
            setProgress: (percent) => {
                bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
            },
            setColor: (color) => {
                bar.style.background = color;
            }
        };
    }
    
    /**
     * camelCaseをkebab-caseに変換
     * @private
     */
    static camelToKebab(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
    
    /**
     * 要素を安全に取得（存在しない場合はnull）
     * @param {string} selector - セレクタ
     * @returns {Element|null}
     */
    static getElement(selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            console.warn(`Invalid selector: ${selector}`);
            return null;
        }
    }
    
    /**
     * 要素の表示/非表示を切り替え
     * @param {Element|string} element - 要素またはセレクタ
     * @param {boolean} show - 表示するかどうか
     * @param {string} displayType - 表示時のdisplayタイプ
     */
    static toggleDisplay(element, show, displayType = 'block') {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (el) {
            el.style.display = show ? displayType : 'none';
        }
    }
}

// グローバルに公開
window.UIHelper = UIHelper;

// エクスポート（ES6モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIHelper };
}