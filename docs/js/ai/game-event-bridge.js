/**
 * ゲームイベントブリッジ
 * PythonゲームエンジンからのイベントをJavaScriptのAIシステムに橋渡し
 */

class GameEventBridge {
    constructor() {
        this.initialized = false;
        this.eventQueue = [];
        this.setupPythonBridge();
    }
    
    /**
     * Pythonとの通信を設定
     */
    setupPythonBridge() {
        // Pyodideが読み込まれるまで待機
        const checkPyodide = setInterval(() => {
            if (window.pyodide && window.pyodide.runPython) {
                clearInterval(checkPyodide);
                this.initializeBridge();
            }
        }, 100);
    }
    
    /**
     * ブリッジを初期化
     */
    initializeBridge() {
        try {
            // Python側にJavaScriptのイベント発火関数を登録
            window.pyodide.runPython(`
import js

def fire_game_event(event_type, event_data):
    """JavaScriptのゲームイベントを発火"""
    js.window.fireGameEvent(event_type, js.Object.fromEntries(event_data.items() if hasattr(event_data, 'items') else {}))

# グローバルに公開
__builtins__['fire_game_event'] = fire_game_event
            `);
            
            // JavaScript側のイベント発火関数
            window.fireGameEvent = (eventType, eventData) => {
                const event = new CustomEvent(`game:${eventType}`, {
                    detail: eventData || {}
                });
                window.dispatchEvent(event);
            };
            
            this.initialized = true;
            console.log('Game Event Bridge initialized');
            
            // イベントをPythonゲームエンジンに注入
            this.injectEventHandlers();
            
        } catch (error) {
            console.error('Failed to initialize Game Event Bridge:', error);
        }
    }
    
    /**
     * Pythonゲームエンジンにイベントハンドラーを注入
     */
    injectEventHandlers() {
        try {
            window.pyodide.runPython(`
# ゲームインスタンスが存在する場合、イベントフックを追加
if 'game' in globals() and hasattr(game, 'game_state'):
    original_update = game.game_state.update_ball_position
    
    def update_with_events(ball):
        # 元の更新処理を実行
        result = original_update(ball)
        
        # イベントを発火
        if hasattr(game.game_state, '_last_collision_type'):
            collision_type = game.game_state._last_collision_type
            if collision_type == 'paddle':
                fire_game_event('paddleHit', {
                    'speed': (ball.dx**2 + ball.dy**2)**0.5,
                    'position': {'x': ball.x, 'y': ball.y}
                })
            elif collision_type == 'miss':
                fire_game_event('miss', {
                    'position': {'x': ball.x, 'y': ball.y},
                    'score': game.game_state.score.point if hasattr(game.game_state, 'score') else 0
                })
            elif collision_type == 'wall':
                fire_game_event('wallHit', {
                    'position': {'x': ball.x, 'y': ball.y}
                })
        
        return result
    
    # 更新関数を置き換え
    game.game_state.update_ball_position = update_with_events
    
    # スコア更新時のイベントフック
    if hasattr(game.game_state, 'score') and hasattr(game.game_state.score, 'add_point'):
        original_add_point = game.game_state.score.add_point
        
        def add_point_with_event(points=10):
            original_add_point(points)
            fire_game_event('score', {
                'score': game.game_state.score.point
            })
        
        game.game_state.score.add_point = add_point_with_event
    
    print("Game event handlers injected")
            `);
        } catch (error) {
            console.error('Failed to inject event handlers:', error);
        }
    }
    
    /**
     * より簡単なイベント発火方法（ポーリング）
     */
    startEventPolling() {
        setInterval(() => {
            if (!window.pyodide) return;
            
            try {
                const gameState = window.pyodide.runPython(`
import json
if 'game' in globals() and hasattr(game, 'game_state'):
    state = {
        'score': game.game_state.score.point if hasattr(game.game_state, 'score') else 0,
        'balls': len(game.game_state.balls) if hasattr(game.game_state, 'balls') else 0,
        'is_gameover': game.game_state.is_gameover if hasattr(game.game_state, 'is_gameover') else False
    }
    json.dumps(state)
else:
    '{}'
                `);
                
                const state = JSON.parse(gameState);
                
                // スコアが変わったらイベント発火
                if (this.lastScore !== undefined && state.score !== this.lastScore) {
                    window.fireGameEvent('score', { score: state.score });
                }
                this.lastScore = state.score;
                
            } catch (error) {
                // エラーは無視（ゲームがまだ初期化されていない可能性）
            }
        }, 500); // 500msごとにチェック
    }
}

// ブリッジを初期化
const gameEventBridge = new GameEventBridge();

// 簡易的なイベント発火（デモ用）
setTimeout(() => {
    // ゲームが開始されたらポーリングも開始
    gameEventBridge.startEventPolling();
}, 5000);

// エクスポート
window.gameEventBridge = gameEventBridge;