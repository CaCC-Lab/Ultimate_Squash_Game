/**
 * Parallel Initializer - Phase 4: 並列初期化の実装
 * 
 * pygame-ceとゲームコードの並列読み込みと初期化プロセスの最適化
 */

class ParallelInitializer {
    constructor() {
        this.initializationStatus = {
            started: false,
            completed: false,
            pyodideReady: false,
            pygameCeReady: false,
            gameCodeReady: false,
            audioReady: false,
            canvasReady: false,
            startTime: null,
            endTime: null,
            stages: {}
        };
        
        this.eventListeners = new Map();
        this.loadingStages = [
            { name: 'pyodide', priority: 1, parallel: false },
            { name: 'pygame-ce', priority: 2, parallel: true },
            { name: 'game-code', priority: 2, parallel: true },
            { name: 'audio-system', priority: 3, parallel: true },
            { name: 'canvas-setup', priority: 3, parallel: true }
        ];
        
        // ブラウザ適応タイムアウトシステムの初期化
        this.adaptiveTimeout = window.browserAdaptiveTimeout || null;
        this.browserOptimizations = this.adaptiveTimeout ? 
            this.adaptiveTimeout.getBrowserSpecificOptimizations() : 
            this.getDefaultOptimizations();
        
        // Pyodideパフォーマンストラッカーの統合
        this.performanceTracker = window.pyodideTracker || null;
        if (this.performanceTracker) {
            console.log('[Parallel Initializer] Performance tracker integrated');
        } else {
            console.warn('[Parallel Initializer] Performance tracker not found - loading...');
            this.loadPerformanceTracker();
        }
        
        // Python Bundle Loader の統合（Gemini提案のバンドリング最適化）
        this.pythonBundleLoader = null;
        this.loadPythonBundleLoader();
        
        console.log('[Parallel Initializer] Initialized with', this.loadingStages.length, 'stages');
        console.log('[Parallel Initializer] Browser optimizations:', this.browserOptimizations);
    }
    
    /**
     * パフォーマンストラッカーの動的ロード
     */
    async loadPerformanceTracker() {
        try {
            const { pyodideTracker } = await import('./optimization/pyodide-performance-tracker.js');
            this.performanceTracker = pyodideTracker;
            console.log('[Parallel Initializer] Performance tracker loaded dynamically');
        } catch (error) {
            console.warn('[Parallel Initializer] Could not load performance tracker:', error);
        }
    }
    
    /**
     * Python Bundle Loader の動的読み込み
     */
    async loadPythonBundleLoader() {
        try {
            const { PythonBundleLoader } = await import('../optimization/python-bundle-loader.js');
            this.pythonBundleLoader = new PythonBundleLoader();
            console.log('[Parallel Initializer] Python Bundle Loader integrated');
        } catch (error) {
            console.warn('[Parallel Initializer] Could not load Python Bundle Loader:', error);
        }
    }
    
    /**
     * デフォルトの最適化設定
     */
    getDefaultOptimizations() {
        return {
            webWorkerPoolSize: 2,
            enableServiceWorker: true,
            useRequestIdleCallback: false,
            priorityHints: false
        };
    }
    
    /**
     * 並列初期化を開始
     */
    async startInitialization() {
        if (this.initializationStatus.started) {
            console.log('[Parallel Initializer] Already started');
            return this.initializationStatus.completed;
        }
        
        this.initializationStatus.started = true;
        this.initializationStatus.startTime = Date.now();
        
        // パフォーマンストラッキング開始（Gemini提案のベースライン測定）
        if (this.performanceTracker) {
            this.performanceTracker.startInitializationTracking();
            console.log('[Parallel Initializer] Performance tracking started');
        }
        
        console.log('[Parallel Initializer] Starting parallel initialization');
        
        this.emit('initializationStarted', {
            stages: this.loadingStages,
            totalStages: this.loadingStages.length
        });
        
        try {
            // Priority 1: Pyodide初期化（他の処理の前提条件）
            await this.initializePyodide();
            
            // Priority 2: pygame-ce と game-code を並列実行
            await this.runParallelStage2();
            
            // Priority 3: audio-system と canvas-setup を並列実行
            await this.runParallelStage3();
            
            // 最終統合とセットアップ
            await this.finalizeInitialization();
            
            this.initializationStatus.completed = true;
            this.initializationStatus.endTime = Date.now();
            
            // パフォーマンストラッキング完了（Gemini提案のTTI測定）
            if (this.performanceTracker) {
                this.performanceTracker.completeInitialization();
                
                // ランタイムトラッキング開始
                this.performanceTracker.startRuntimeTracking();
                
                console.log('[Parallel Initializer] Performance tracking completed - TTI measured');
            }
            
            console.log('[Parallel Initializer] Initialization completed:', this.getInitializationStats());
            this.emit('initializationCompleted', this.getInitializationStats());
            
            return true;
            
        } catch (error) {
            console.error('[Parallel Initializer] Initialization failed:', error);
            this.emit('initializationError', error);
            return false;
        }
    }
    
    /**
     * Pyodide初期化（適応的タイムアウト対応）
     */
    async initializePyodide() {
        const startTime = Date.now();
        
        this.emit('stageStarted', { stage: 'pyodide', message: 'Pyodide初期化中...' });
        
        try {
            // 適応的タイムアウトを使用した初期化
            if (this.adaptiveTimeout) {
                return await this.adaptiveTimeout.waitWithProgressiveTimeout(
                    'pyodideInit',
                    async () => await this.performPyodideInitialization(startTime),
                    3 // 最大3回リトライ
                );
            } else {
                return await this.performPyodideInitialization(startTime);
            }
            
        } catch (error) {
            console.error('[Parallel Initializer] Pyodide initialization failed:', error);
            this.initializationStatus.stages.pyodide = {
                completed: false,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            };
            throw error;
        }
    }
    
    /**
     * Pyodide初期化の実際の処理
     */
    async performPyodideInitialization(startTime) {
        // PyodidePreloaderで事前読み込み済みかチェック
        const preloaderStatus = window.pyodidePreloader?.getPreloadStatus();
        if (preloaderStatus && preloaderStatus.completed) {
            console.log('[Parallel Initializer] Using preloaded Pyodide');
            this.emit('stageProgress', { stage: 'pyodide', progress: 50, message: 'プリロード済みPyodideを使用中...' });
            
            // パフォーマンストラッカーにステージ記録
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('pyodide_preload_detected');
            }
        }
        
        // Pyodideの初期化
        if (typeof loadPyodide === 'undefined') {
            // pyodide.jsを動的ロード
            await this.loadPyodideScript();
            this.emit('stageProgress', { stage: 'pyodide', progress: 25, message: 'pyodide.jsを読み込み中...' });
            
            // パフォーマンストラッカーにステージ記録
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('pyodide_script_loaded');
            }
        }
        
        // Pyodideインスタンスの作成（ブラウザ固有設定を考慮）
        const pyodideConfig = {
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
        };
        
        // WebKit環境での最適化
        if (this.adaptiveTimeout?.browserInfo.isWebKit) {
            console.log('[Parallel Initializer] Applying WebKit-specific optimizations');
            pyodideConfig.fullStdLib = false; // 標準ライブラリを最小化
        }
        
        window.pyodide = await loadPyodide(pyodideConfig);
        
        // パフォーマンストラッカーにPyodide初期化完了を記録
        if (this.performanceTracker) {
            this.performanceTracker.recordStage('pyodide_ready');
        }
        
        this.emit('stageProgress', { stage: 'pyodide', progress: 75, message: 'Pyodide初期化完了...' });
        
        // 基本的なPythonライブラリの準備（必要最小限に制限）
        const packages = this.browserOptimizations.webWorkerPoolSize > 1 ? 
            ['numpy', 'micropip'] : ['micropip']; // 低性能環境では最小限
        
        await window.pyodide.loadPackage(packages);
        
        // パフォーマンストラッカーにパッケージロード完了を記録
        if (this.performanceTracker) {
            this.performanceTracker.recordStage('pyodide_packages_loaded');
        }
        
        // Python Bundle Loader による最適化読み込み（Gemini提案のバンドリング実装）
        if (this.pythonBundleLoader) {
            console.log('[Parallel Initializer] Starting Python bundle optimization...');
            this.emit('stageProgress', { stage: 'pyodide', progress: 85, message: 'Pythonバンドル最適化中...' });
            
            try {
                const gameInstance = await this.pythonBundleLoader.initializePyodideWithBundle(window.pyodide);
                window.gameInstance = gameInstance;
                
                if (this.performanceTracker) {
                    this.performanceTracker.recordStage('python_bundle_optimized');
                }
                
                console.log('[Parallel Initializer] Python bundle optimization successful');
            } catch (error) {
                console.warn('[Parallel Initializer] Python bundle optimization failed, using fallback:', error);
                
                if (this.performanceTracker) {
                    this.performanceTracker.recordStage('python_bundle_fallback');
                }
            }
        }
        
        this.initializationStatus.pyodideReady = true;
        this.initializationStatus.stages.pyodide = {
            completed: true,
            duration: Date.now() - startTime,
            success: true
        };
        
        this.emit('stageCompleted', { 
            stage: 'pyodide', 
            duration: Date.now() - startTime,
            message: 'Pyodide初期化完了（バンドル最適化済み）'
        });
        
        return true;
    }
    
    /**
     * pyodide.jsスクリプトの動的ロード
     */
    async loadPyodideScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
            script.onload = () => {
                console.log('[Parallel Initializer] pyodide.js loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load pyodide.js'));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Priority 2: pygame-ce と game-code の並列実行
     */
    async runParallelStage2() {
        console.log('[Parallel Initializer] Starting parallel stage 2');
        
        const stage2Tasks = [
            this.initializePygameCe(),
            this.loadGameCode()
        ];
        
        await Promise.all(stage2Tasks);
        console.log('[Parallel Initializer] Stage 2 completed');
    }
    
    /**
     * pygame-ce初期化
     */
    async initializePygameCe() {
        const startTime = Date.now();
        
        this.emit('stageStarted', { stage: 'pygame-ce', message: 'pygame-ce初期化中...' });
        
        try {
            // pygame-ceをインストール
            await window.pyodide.loadPackage(['pygame-ce']);
            
            // パフォーマンストラッカーにpygame-ceロード完了を記録
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('pygame_package_loaded');
            }
            
            this.emit('stageProgress', { stage: 'pygame-ce', progress: 50, message: 'pygame-ceパッケージロード完了...' });
            
            // pygame-ceの初期化
            window.pyodide.runPython(`
                import pygame
                pygame.init()
                
                # WebGL/Canvas環境での初期化
                import sys
                if 'pyodide' in sys.modules:
                    # Pyodide環境でのpygame設定
                    pygame.display.set_mode((800, 600))
                    print("pygame-ce initialized for web environment")
            `);
            
            this.emit('stageProgress', { stage: 'pygame-ce', progress: 75, message: 'pygame-ce初期化完了...' });
            
            // 基本的なサーフェスとレンダラーの準備
            window.pyodide.runPython(`
                # ゲーム用のサーフェス準備
                screen = pygame.display.set_mode((800, 600))
                clock = pygame.time.Clock()
                
                # 基本的な描画テスト
                screen.fill((0, 0, 0))
                pygame.display.flip()
                
                print("pygame-ce screen initialized: 800x600")
            `);
            
            // パフォーマンストラッカーにpygame初期化完了を記録
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('pygame_ready');
            }
            
            this.initializationStatus.pygameCeReady = true;
            this.initializationStatus.stages['pygame-ce'] = {
                completed: true,
                duration: Date.now() - startTime,
                success: true
            };
            
            this.emit('stageCompleted', { 
                stage: 'pygame-ce', 
                duration: Date.now() - startTime,
                message: 'pygame-ce初期化完了'
            });
            
        } catch (error) {
            console.error('[Parallel Initializer] pygame-ce initialization failed:', error);
            this.initializationStatus.stages['pygame-ce'] = {
                completed: false,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            };
            throw error;
        }
    }
    
    /**
     * ゲームコード読み込み
     */
    async loadGameCode() {
        const startTime = Date.now();
        
        this.emit('stageStarted', { stage: 'game-code', message: 'ゲームコード読み込み中...' });
        
        try {
            // メインゲームファイルの読み込み
            const gameFiles = [
                'main.py',
                'game_engine.py',
                'ai_enhancer.py'
            ];
            
            let loadedFiles = 0;
            
            for (const filename of gameFiles) {
                try {
                    const response = await fetch(filename);
                    if (response.ok) {
                        const code = await response.text();
                        
                        // Pyodideファイルシステムにファイルを書き込み
                        window.pyodide.FS.writeFile(filename, code);
                        
                        loadedFiles++;
                        const progress = (loadedFiles / gameFiles.length) * 100;
                        this.emit('stageProgress', { 
                            stage: 'game-code', 
                            progress: progress, 
                            message: `${filename} 読み込み完了...` 
                        });
                        
                        console.log(`[Parallel Initializer] Loaded: ${filename}`);
                    } else {
                        console.warn(`[Parallel Initializer] Could not load ${filename}: ${response.status}`);
                    }
                } catch (error) {
                    console.warn(`[Parallel Initializer] Error loading ${filename}:`, error);
                }
            }
            
            // ゲームコードのプリコンパイル
            window.pyodide.runPython(`
                import sys
                import importlib
                
                # ゲームモジュールの事前コンパイル
                try:
                    import game_engine
                    importlib.reload(game_engine)
                    print("game_engine precompiled")
                except Exception as e:
                    print(f"game_engine precompile error: {e}")
                
                try:
                    import ai_enhancer
                    importlib.reload(ai_enhancer)
                    print("ai_enhancer precompiled")
                except Exception as e:
                    print(f"ai_enhancer precompile error: {e}")
            `);
            
            this.initializationStatus.gameCodeReady = true;
            this.initializationStatus.stages['game-code'] = {
                completed: true,
                duration: Date.now() - startTime,
                success: true,
                loadedFiles: loadedFiles
            };
            
            this.emit('stageCompleted', { 
                stage: 'game-code', 
                duration: Date.now() - startTime,
                message: `ゲームコード読み込み完了 (${loadedFiles}/${gameFiles.length})`
            });
            
        } catch (error) {
            console.error('[Parallel Initializer] Game code loading failed:', error);
            this.initializationStatus.stages['game-code'] = {
                completed: false,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            };
            throw error;
        }
    }
    
    /**
     * Priority 3: audio-system と canvas-setup の並列実行
     */
    async runParallelStage3() {
        console.log('[Parallel Initializer] Starting parallel stage 3');
        
        const stage3Tasks = [
            this.initializeAudioSystem(),
            this.setupCanvasIntegration()
        ];
        
        await Promise.all(stage3Tasks);
        console.log('[Parallel Initializer] Stage 3 completed');
    }
    
    /**
     * オーディオシステム初期化
     */
    async initializeAudioSystem() {
        const startTime = Date.now();
        
        this.emit('stageStarted', { stage: 'audio-system', message: 'オーディオシステム初期化中...' });
        
        try {
            // Web Audio APIの初期化
            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                this.emit('stageProgress', { stage: 'audio-system', progress: 25, message: 'Web Audio API初期化完了...' });
                
                // 基本的なオーディオノードの準備
                const gainNode = window.audioContext.createGain();
                gainNode.connect(window.audioContext.destination);
                window.masterGain = gainNode;
                
                this.emit('stageProgress', { stage: 'audio-system', progress: 50, message: 'オーディオノード準備完了...' });
                
                // pygame-ceとの連携準備
                window.pyodide.runPython(`
                    import pygame
                    
                    # pygame mixerの初期化
                    try:
                        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
                        print("pygame mixer initialized")
                    except Exception as e:
                        print(f"pygame mixer init error: {e}")
                        # フォールバック: 基本的なミキサー
                        pygame.mixer.quit()
                        pygame.mixer.init()
                `);
                
                this.emit('stageProgress', { stage: 'audio-system', progress: 75, message: 'pygame mixer連携完了...' });
                
                // 効果音の事前読み込み（オプション）
                await this.preloadSoundEffects();
                
                this.initializationStatus.audioReady = true;
                this.initializationStatus.stages['audio-system'] = {
                    completed: true,
                    duration: Date.now() - startTime,
                    success: true
                };
                
                this.emit('stageCompleted', { 
                    stage: 'audio-system', 
                    duration: Date.now() - startTime,
                    message: 'オーディオシステム初期化完了'
                });
                
            } else {
                throw new Error('Web Audio API not supported');
            }
            
        } catch (error) {
            console.error('[Parallel Initializer] Audio system initialization failed:', error);
            this.initializationStatus.stages['audio-system'] = {
                completed: false,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            };
            
            // オーディオエラーは致命的ではないので、初期化を続行
            this.emit('stageCompleted', { 
                stage: 'audio-system', 
                duration: Date.now() - startTime,
                message: 'オーディオシステム初期化失敗（サイレントモードで続行）'
            });
        }
    }
    
    /**
     * 効果音の事前読み込み
     */
    async preloadSoundEffects() {
        const sounds = [
            'hit.wav',
            'score.wav',
            'wall.wav'
        ];
        
        let loadedSounds = 0;
        
        for (const sound of sounds) {
            try {
                const response = await fetch(`sounds/${sound}`);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await window.audioContext.decodeAudioData(arrayBuffer);
                    
                    // サウンドバッファをキャッシュ
                    if (!window.soundBuffers) {
                        window.soundBuffers = {};
                    }
                    window.soundBuffers[sound] = audioBuffer;
                    
                    loadedSounds++;
                    console.log(`[Parallel Initializer] Preloaded sound: ${sound}`);
                }
            } catch (error) {
                console.warn(`[Parallel Initializer] Could not preload sound ${sound}:`, error);
            }
        }
        
        console.log(`[Parallel Initializer] Preloaded ${loadedSounds}/${sounds.length} sound effects`);
    }
    
    /**
     * Canvasインテグレーション設定
     */
    async setupCanvasIntegration() {
        const startTime = Date.now();
        
        this.emit('stageStarted', { stage: 'canvas-setup', message: 'Canvas統合設定中...' });
        
        try {
            // メインのcanvas要素を取得または作成
            let gameCanvas = document.getElementById('gameCanvas');
            if (!gameCanvas) {
                gameCanvas = document.createElement('canvas');
                gameCanvas.id = 'gameCanvas';
                gameCanvas.width = 800;
                gameCanvas.height = 600;
                gameCanvas.style.cssText = `
                    border: 2px solid #333;
                    border-radius: 10px;
                    background: #000;
                    display: block;
                    margin: 20px auto;
                    box-shadow: 0 0 20px rgba(0,0,0,0.5);
                `;
                document.body.appendChild(gameCanvas);
            }
            
            this.emit('stageProgress', { stage: 'canvas-setup', progress: 25, message: 'Canvas要素準備完了...' });
            
            // pygame-ceとcanvasの連携設定
            window.pyodide.runPython(`
                import pygame
                import js
                from js import document
                
                # Canvas要素の取得
                canvas = document.getElementById('gameCanvas')
                if canvas:
                    print(f"Canvas found: {canvas.width}x{canvas.height}")
                    
                    # pygame displayをcanvasに設定
                    pygame.display.set_mode((canvas.width, canvas.height))
                    screen = pygame.display.get_surface()
                    
                    print("pygame display connected to canvas")
                else:
                    print("Canvas not found, using default display")
                    pygame.display.set_mode((800, 600))
            `);
            
            this.emit('stageProgress', { stage: 'canvas-setup', progress: 50, message: 'pygame-canvas連携完了...' });
            
            // イベントハンドラーの設定
            this.setupCanvasEventHandlers(gameCanvas);
            
            this.emit('stageProgress', { stage: 'canvas-setup', progress: 75, message: 'イベントハンドラー設定完了...' });
            
            // 描画テストの実行
            window.pyodide.runPython(`
                import pygame
                
                # 基本的な描画テスト
                screen = pygame.display.get_surface()
                screen.fill((0, 0, 0))
                pygame.draw.circle(screen, (255, 255, 255), (400, 300), 10)
                pygame.display.flip()
                
                print("Canvas integration test completed")
            `);
            
            // パフォーマンストラッカーに最初のフレーム描画完了を記録（TTI計算用）
            if (this.performanceTracker) {
                this.performanceTracker.recordStage('first_frame');
            }
            
            this.initializationStatus.canvasReady = true;
            this.initializationStatus.stages['canvas-setup'] = {
                completed: true,
                duration: Date.now() - startTime,
                success: true
            };
            
            this.emit('stageCompleted', { 
                stage: 'canvas-setup', 
                duration: Date.now() - startTime,
                message: 'Canvas統合設定完了'
            });
            
        } catch (error) {
            console.error('[Parallel Initializer] Canvas integration setup failed:', error);
            this.initializationStatus.stages['canvas-setup'] = {
                completed: false,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            };
            throw error;
        }
    }
    
    /**
     * Canvasイベントハンドラーの設定
     */
    setupCanvasEventHandlers(canvas) {
        // マウスイベント
        canvas.addEventListener('mousedown', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            if (window.pyodide) {
                window.pyodide.runPython(`
                    import pygame
                    
                    # マウスイベントをpygameに送信
                    event = pygame.event.Event(pygame.MOUSEBUTTONDOWN, pos=(${x}, ${y}), button=1)
                    pygame.event.post(event)
                `);
            }
        });
        
        // キーボードイベント
        document.addEventListener('keydown', (event) => {
            if (window.pyodide) {
                window.pyodide.runPython(`
                    import pygame
                    
                    # キーイベントをpygameに送信
                    key_mapping = {
                        'ArrowUp': pygame.K_UP,
                        'ArrowDown': pygame.K_DOWN,
                        'ArrowLeft': pygame.K_LEFT,
                        'ArrowRight': pygame.K_RIGHT,
                        ' ': pygame.K_SPACE
                    }
                    
                    key = key_mapping.get('${event.key}', 0)
                    if key:
                        event = pygame.event.Event(pygame.KEYDOWN, key=key)
                        pygame.event.post(event)
                `);
            }
        });
        
        console.log('[Parallel Initializer] Canvas event handlers configured');
    }
    
    /**
     * 最終統合とセットアップ
     */
    async finalizeInitialization() {
        console.log('[Parallel Initializer] Finalizing initialization...');
        
        this.emit('stageStarted', { stage: 'finalization', message: '最終統合中...' });
        
        try {
            // 全コンポーネントの統合テスト
            const integrationTest = window.pyodide.runPython(`
                import pygame
                import sys
                
                # 統合テスト
                results = {
                    'pygame_ready': 'pygame' in sys.modules,
                    'display_ready': pygame.display.get_init(),
                    'mixer_ready': pygame.mixer.get_init()
                }
                
                print("Integration test results:", results)
                results
            `);
            
            // ゲームエンジンの初期化テスト
            try {
                window.pyodide.runPython(`
                    # ゲームエンジンの基本的な初期化テスト
                    import game_engine
                    
                    # GameEngineクラスの存在確認
                    if hasattr(game_engine, 'GameEngine'):
                        print("GameEngine class found")
                        
                        # 基本的なインスタンス作成テスト（実際のゲームは開始しない）
                        # engine = game_engine.GameEngine()
                        # print("GameEngine instance created successfully")
                    else:
                        print("GameEngine class not found")
                `);
            } catch (error) {
                console.warn('[Parallel Initializer] Game engine test failed:', error);
            }
            
            // 最終ステータスの設定
            this.initializationStatus.stages.finalization = {
                completed: true,
                duration: Date.now() - this.initializationStatus.startTime,
                success: true,
                integrationTest: integrationTest
            };
            
            this.emit('stageCompleted', { 
                stage: 'finalization', 
                duration: Date.now() - this.initializationStatus.startTime,
                message: '最終統合完了'
            });
            
        } catch (error) {
            console.error('[Parallel Initializer] Finalization failed:', error);
            this.initializationStatus.stages.finalization = {
                completed: false,
                duration: Date.now() - this.initializationStatus.startTime,
                success: false,
                error: error.message
            };
            throw error;
        }
    }
    
    /**
     * 初期化統計情報の取得
     */
    getInitializationStats() {
        const stages = Object.entries(this.initializationStatus.stages);
        const completedStages = stages.filter(([_, stage]) => stage.completed).length;
        const totalDuration = this.initializationStatus.endTime - this.initializationStatus.startTime;
        
        return {
            totalDuration: totalDuration,
            completedStages: completedStages,
            totalStages: stages.length,
            successRate: (completedStages / stages.length) * 100,
            stages: this.initializationStatus.stages,
            readyStatus: {
                pyodideReady: this.initializationStatus.pyodideReady,
                pygameCeReady: this.initializationStatus.pygameCeReady,
                gameCodeReady: this.initializationStatus.gameCodeReady,
                audioReady: this.initializationStatus.audioReady,
                canvasReady: this.initializationStatus.canvasReady
            }
        };
    }
    
    /**
     * 初期化状態の取得
     */
    getInitializationStatus() {
        return { ...this.initializationStatus };
    }
    
    /**
     * ゲーム開始準備完了確認
     */
    isReadyToStart() {
        return this.initializationStatus.pyodideReady && 
               this.initializationStatus.pygameCeReady && 
               this.initializationStatus.gameCodeReady;
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
                    console.error(`[Parallel Initializer] Event ${event} callback error:`, error);
                }
            });
        }
    }
}

// グローバルに公開（従来のスクリプトタグ読み込み用）
window.ParallelInitializer = ParallelInitializer;

// ES6モジュール形式でもエクスポート（テスト環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParallelInitializer };
}

// ES6 export（モジュールシステム用）
if (typeof window !== 'undefined') {
    window.ParallelInitializerModule = { ParallelInitializer };
}