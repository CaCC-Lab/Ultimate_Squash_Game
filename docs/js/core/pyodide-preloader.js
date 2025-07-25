/**
 * Pyodide Preloader - Phase 3: プリロード機能の実装
 * 
 * ゲームページへの遷移前にPyodideファイルを事前読み込みして
 * 初期化時間を短縮する
 */

class PyodidePreloader {
    constructor() {
        this.isSupported = this.checkBrowserSupport();
        this.preloadStatus = {
            started: false,
            completed: false,
            error: null,
            progress: 0,
            files: {},
            startTime: null,
            endTime: null
        };
        
        // プリロード対象のPyodideファイル
        this.pyodideFiles = [
            'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',
            'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.js',
            'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.wasm',
            'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide-lock.json',
            'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.data'
        ];
        
        this.eventListeners = new Map();
        this.workerPool = [];
        this.maxWorkers = navigator.hardwareConcurrency || 4;
        
        console.log('[Pyodide Preloader] Initialized with support:', this.isSupported);
    }
    
    /**
     * ブラウザのサポート状況を確認
     */
    checkBrowserSupport() {
        const support = {
            serviceWorker: 'serviceWorker' in navigator,
            webWorker: typeof Worker !== 'undefined',
            fetch: typeof fetch !== 'undefined',
            promise: typeof Promise !== 'undefined',
            arrayBuffer: typeof ArrayBuffer !== 'undefined'
        };
        
        const isSupported = Object.values(support).every(Boolean);
        console.log('[Pyodide Preloader] Browser support:', support, 'Overall:', isSupported);
        
        return isSupported;
    }
    
    /**
     * プリロードを開始
     */
    async startPreload() {
        if (!this.isSupported) {
            console.warn('[Pyodide Preloader] Browser not supported, skipping preload');
            return false;
        }
        
        if (this.preloadStatus.started) {
            console.log('[Pyodide Preloader] Already started');
            return this.preloadStatus.completed;
        }
        
        this.preloadStatus.started = true;
        this.preloadStatus.startTime = Date.now();
        
        console.log('[Pyodide Preloader] Starting preload of', this.pyodideFiles.length, 'files');
        
        this.emit('preloadStarted', {
            files: this.pyodideFiles,
            totalFiles: this.pyodideFiles.length
        });
        
        try {
            // Service Worker がある場合は Service Worker 経由でキャッシュ
            if (await this.checkServiceWorkerCache()) {
                console.log('[Pyodide Preloader] Files already cached in Service Worker');
                this.preloadStatus.completed = true;
                this.preloadStatus.progress = 100;
                this.preloadStatus.endTime = Date.now();
                this.emit('preloadCompleted', this.getPreloadStats());
                return true;
            }
            
            // Web Worker を使用した並列プリロード
            await this.preloadWithWorkers();
            
            this.preloadStatus.completed = true;
            this.preloadStatus.endTime = Date.now();
            
            console.log('[Pyodide Preloader] Preload completed:', this.getPreloadStats());
            this.emit('preloadCompleted', this.getPreloadStats());
            
            return true;
            
        } catch (error) {
            console.error('[Pyodide Preloader] Preload failed:', error);
            this.preloadStatus.error = error.message;
            this.emit('preloadError', error);
            return false;
        }
    }
    
    /**
     * Service Worker キャッシュの確認
     */
    async checkServiceWorkerCache() {
        if (!('caches' in window)) {
            return false;
        }
        
        try {
            const cacheNames = await caches.keys();
            const pyodideCache = cacheNames.find(name => name.includes('pyodide'));
            
            if (pyodideCache) {
                const cache = await caches.open(pyodideCache);
                const cachedFiles = await Promise.all(
                    this.pyodideFiles.map(async url => {
                        const response = await cache.match(url);
                        return response ? url : null;
                    })
                );
                
                const cachedCount = cachedFiles.filter(Boolean).length;
                console.log(`[Pyodide Preloader] Service Worker cache: ${cachedCount}/${this.pyodideFiles.length} files`);
                
                return cachedCount === this.pyodideFiles.length;
            }
            
            return false;
        } catch (error) {
            console.warn('[Pyodide Preloader] Service Worker cache check failed:', error);
            return false;
        }
    }
    
    /**
     * Web Worker を使用した並列プリロード
     */
    async preloadWithWorkers() {
        // Web Worker 用のコードを動的に生成
        const workerCode = this.generateWorkerCode();
        const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        
        const batchSize = Math.ceil(this.pyodideFiles.length / this.maxWorkers);
        const batches = [];
        
        // ファイルをバッチに分割
        for (let i = 0; i < this.pyodideFiles.length; i += batchSize) {
            batches.push(this.pyodideFiles.slice(i, i + batchSize));
        }
        
        console.log(`[Pyodide Preloader] Processing ${batches.length} batches with ${this.maxWorkers} workers`);
        
        // 各バッチを Worker で処理
        const workerPromises = batches.map((batch, index) => {
            return this.processWorkerBatch(workerUrl, batch, index);
        });
        
        await Promise.all(workerPromises);
        
        // Cleanup
        URL.revokeObjectURL(workerUrl);
        this.workerPool.forEach(worker => worker.terminate());
        this.workerPool = [];
    }
    
    /**
     * Worker バッチの処理
     */
    async processWorkerBatch(workerUrl, batch, batchIndex) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(workerUrl);
            this.workerPool.push(worker);
            
            worker.onmessage = (event) => {
                const { type, data } = event.data;
                
                switch (type) {
                    case 'fileCompleted':
                        this.handleFileCompleted(data);
                        break;
                        
                    case 'batchCompleted':
                        console.log(`[Pyodide Preloader] Batch ${batchIndex} completed:`, data);
                        resolve(data);
                        break;
                        
                    case 'error':
                        console.error(`[Pyodide Preloader] Worker ${batchIndex} error:`, data);
                        reject(new Error(data.message));
                        break;
                }
            };
            
            worker.onerror = (error) => {
                console.error(`[Pyodide Preloader] Worker ${batchIndex} error:`, error);
                reject(error);
            };
            
            // バッチ処理を開始
            worker.postMessage({
                type: 'processBatch',
                batch: batch,
                batchIndex: batchIndex
            });
        });
    }
    
    /**
     * ファイル完了処理
     */
    handleFileCompleted(data) {
        const { url, size, success, error } = data;
        
        this.preloadStatus.files[url] = {
            size: size,
            success: success,
            error: error,
            timestamp: Date.now()
        };
        
        const completedFiles = Object.keys(this.preloadStatus.files).length;
        this.preloadStatus.progress = (completedFiles / this.pyodideFiles.length) * 100;
        
        console.log(`[Pyodide Preloader] File completed: ${url.split('/').pop()} (${completedFiles}/${this.pyodideFiles.length})`);
        
        this.emit('preloadProgress', {
            url: url,
            progress: this.preloadStatus.progress,
            completedFiles: completedFiles,
            totalFiles: this.pyodideFiles.length
        });
    }
    
    /**
     * Web Worker 用コードの生成
     */
    generateWorkerCode() {
        return `
            let preloadedFiles = new Map();
            
            self.onmessage = async function(event) {
                const { type, batch, batchIndex } = event.data;
                
                if (type === 'processBatch') {
                    try {
                        const results = [];
                        
                        for (const url of batch) {
                            try {
                                const startTime = Date.now();
                                const response = await fetch(url);
                                
                                if (!response.ok) {
                                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                                }
                                
                                const arrayBuffer = await response.arrayBuffer();
                                const endTime = Date.now();
                                
                                // メモリにキャッシュ
                                preloadedFiles.set(url, {
                                    data: arrayBuffer,
                                    headers: Object.fromEntries(response.headers.entries()),
                                    timestamp: Date.now()
                                });
                                
                                const fileData = {
                                    url: url,
                                    size: arrayBuffer.byteLength,
                                    success: true,
                                    loadTime: endTime - startTime
                                };
                                
                                results.push(fileData);
                                
                                self.postMessage({
                                    type: 'fileCompleted',
                                    data: fileData
                                });
                                
                            } catch (error) {
                                const fileData = {
                                    url: url,
                                    size: 0,
                                    success: false,
                                    error: error.message
                                };
                                
                                results.push(fileData);
                                
                                self.postMessage({
                                    type: 'fileCompleted',
                                    data: fileData
                                });
                            }
                        }
                        
                        self.postMessage({
                            type: 'batchCompleted',
                            data: {
                                batchIndex: batchIndex,
                                results: results,
                                totalSize: results.reduce((sum, file) => sum + file.size, 0)
                            }
                        });
                        
                    } catch (error) {
                        self.postMessage({
                            type: 'error',
                            data: {
                                message: error.message,
                                batchIndex: batchIndex
                            }
                        });
                    }
                }
            };
        `;
    }
    
    /**
     * プリロード統計情報の取得
     */
    getPreloadStats() {
        const files = Object.values(this.preloadStatus.files);
        const successful = files.filter(f => f.success);
        const totalSize = successful.reduce((sum, f) => sum + f.size, 0);
        const duration = this.preloadStatus.endTime - this.preloadStatus.startTime;
        
        return {
            duration: duration,
            totalFiles: this.pyodideFiles.length,
            successfulFiles: successful.length,
            failedFiles: files.length - successful.length,
            totalSize: totalSize,
            averageSpeed: totalSize / (duration / 1000), // bytes per second
            progress: this.preloadStatus.progress
        };
    }
    
    /**
     * プリロード状態の取得
     */
    getPreloadStatus() {
        return { ...this.preloadStatus };
    }
    
    /**
     * イベントリスナーの追加
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * イベントリスナーの削除
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * イベントの発火
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[Pyodide Preloader] Event ${event} callback error:`, error);
                }
            });
        }
    }
    
    /**
     * 自動プリロード開始（ページ読み込み後）
     */
    static autoStart(options = {}) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                PyodidePreloader.initializeAndStart(options);
            });
        } else {
            PyodidePreloader.initializeAndStart(options);
        }
    }
    
    /**
     * 初期化と開始
     */
    static initializeAndStart(options = {}) {
        const preloader = new PyodidePreloader();
        
        // プリロード状況をコンソールに出力
        if (options.verbose !== false) {
            preloader.on('preloadStarted', (data) => {
                console.log('[Pyodide Preloader] Started preloading', data.totalFiles, 'files');
            });
            
            preloader.on('preloadProgress', (data) => {
                console.log(`[Pyodide Preloader] Progress: ${data.progress.toFixed(1)}% (${data.completedFiles}/${data.totalFiles})`);
            });
            
            preloader.on('preloadCompleted', (stats) => {
                console.log('[Pyodide Preloader] Completed:', stats);
            });
            
            preloader.on('preloadError', (error) => {
                console.error('[Pyodide Preloader] Error:', error);
            });
        }
        
        // グローバルに公開
        window.pyodidePreloader = preloader;
        
        // 自動開始
        preloader.startPreload();
        
        return preloader;
    }
}

// グローバルに公開
window.PyodidePreloader = PyodidePreloader;