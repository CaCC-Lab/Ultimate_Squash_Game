/**
 * WebSocket認証ユーティリティ
 * HMAC-SHA256ベースの認証機構を提供
 */

class WebSocketAuthenticator {
    /**
     * @param {string} serverUrl - WebSocketサーバーURL
     * @param {string} clientToken - クライアント認証トークン
     */
    constructor(serverUrl, clientToken) {
        this.serverUrl = serverUrl;
        this.clientToken = clientToken || this.generateClientToken();
        this.ws = null;
        this.authenticated = false;
        this.authCallbacks = {
            onSuccess: null,
            onFailure: null,
            onTimeout: null
        };
    }

    /**
     * クライアントトークンを生成
     * @returns {string} ランダムな16進数トークン
     */
    generateClientToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * HMAC-SHA256署名を生成
     * @param {string} message - 署名対象メッセージ
     * @param {string} secret - 秘密鍵
     * @returns {Promise<string>} 16進数署名
     */
    async generateSignature(message, secret) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(message);
        
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            messageData
        );
        
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * 認証付きWebSocket接続を確立
     * @param {Object} callbacks - 認証コールバック
     * @returns {Promise<WebSocket>}
     */
    async connect(callbacks = {}) {
        Object.assign(this.authCallbacks, callbacks);
        
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.onopen = () => {
                    console.log('[WebSocketAuth] Connection opened');
                };
                
                this.ws.onmessage = async (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'auth:required') {
                            // 認証要求を受信
                            await this.authenticate();
                        } else if (data.type === 'auth:success') {
                            // 認証成功
                            this.authenticated = true;
                            console.log('[WebSocketAuth] Authentication successful');
                            if (this.authCallbacks.onSuccess) {
                                this.authCallbacks.onSuccess(this.ws);
                            }
                            resolve(this.ws);
                        } else if (data.type === 'auth:failed') {
                            // 認証失敗
                            console.error('[WebSocketAuth] Authentication failed:', data.payload.message);
                            if (this.authCallbacks.onFailure) {
                                this.authCallbacks.onFailure(data.payload.message);
                            }
                            reject(new Error(data.payload.message));
                        } else if (data.type === 'auth:timeout') {
                            // 認証タイムアウト
                            console.error('[WebSocketAuth] Authentication timeout');
                            if (this.authCallbacks.onTimeout) {
                                this.authCallbacks.onTimeout();
                            }
                            reject(new Error('Authentication timeout'));
                        }
                    } catch (error) {
                        console.error('[WebSocketAuth] Message handling error:', error);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('[WebSocketAuth] WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('[WebSocketAuth] Connection closed');
                    this.authenticated = false;
                };
                
            } catch (error) {
                console.error('[WebSocketAuth] Connection error:', error);
                reject(error);
            }
        });
    }

    /**
     * 認証を実行
     */
    async authenticate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }
        
        const timestamp = new Date().toISOString();
        const message = `${this.clientToken}:${timestamp}`;
        
        // サーバー秘密鍵は実際の実装では環境変数や設定から取得
        const serverSecret = window.WS_SERVER_SECRET || 'default_secret_key_for_development';
        const signature = await this.generateSignature(message, serverSecret);
        
        const authMessage = {
            type: 'auth:token',
            payload: {
                token: this.clientToken,
                timestamp: timestamp,
                signature: signature
            }
        };
        
        this.ws.send(JSON.stringify(authMessage));
        console.log('[WebSocketAuth] Authentication request sent');
    }

    /**
     * メッセージを送信
     * @param {string} type - メッセージタイプ
     * @param {Object} payload - ペイロード
     */
    send(type, payload = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }
        
        if (!this.authenticated) {
            throw new Error('WebSocket is not authenticated');
        }
        
        const message = {
            type: type,
            payload: payload,
            timestamp: new Date().toISOString()
        };
        
        this.ws.send(JSON.stringify(message));
    }

    /**
     * 接続を閉じる
     */
    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.authenticated = false;
        }
    }

    /**
     * 認証状態を取得
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.authenticated;
    }
}

// エクスポート（ES6モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketAuthenticator;
}