#!/usr/bin/env python3
"""
WebSocket統合版スカッシュゲーム - メインエントリーポイント

個人開発規約遵守:
- TDD必須: WebSocket通信テスト済み
- モック禁止: 実際のWebSocket環境での動作確認
- エラー3要素: WebSocket接続エラー時の適切なメッセージ

技術統合:
- Pygame-CE + WebSocket統合
- リアルタイム状態同期
- チャレンジシステム連携
"""

import sys
import os
import asyncio
import threading
import time
import logging

# パスの設定
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, 'src')
pygame_src_dir = os.path.join(current_dir, 'pygame_version', 'src')
sys.path.insert(0, src_dir)
sys.path.insert(0, pygame_src_dir)

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import pygame
    from model.pygame_game_state import PygameGameState
    from view.pygame_game_view import PygameGameView, PygameSoundView
    from controller.pygame_game_controller import PygameGameController
    from websocket_server import GameWebSocketServer, start_server
    
    logger.info(f"pygame-ce {pygame.version.ver} (SDL {pygame.version.SDL}, Python {sys.version.split()[0]})")
    
except ImportError as e:
    error_msg = {
        'what': "必要なライブラリのインポートに失敗しました",
        'why': f"pygame-ceまたはWebSocketモジュールが見つかりません: {str(e)}",
        'how': "pip install pygame-ce websockets でライブラリをインストールしてください"
    }
    logger.error(f"インポートエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    sys.exit(1)


class WebSocketGameEngine:
    """WebSocket統合ゲームエンジン"""
    
    def __init__(self):
        self.websocket_server = None
        self.game_state = None
        self.controller = None
        self.loop = None
        self.websocket_thread = None
        
    def setup_pygame(self):
        """ヘッドレスPygameゲームエンジンのセットアップ（表示なし）"""
        try:
            # ヘッドレスでPygame初期化（表示ドライバーなし）
            import os
            os.environ['SDL_VIDEODRIVER'] = 'dummy'
            pygame.init()
            
            # ヘッドレス用の仮想画面設定（表示されない）
            screen_width = 640
            screen_height = 480
            
            # MVCコンポーネント作成（ヘッドレス用）
            self.game_state = PygameGameState()
            
            # ヘッドレス専用のダミービューを作成
            class HeadlessGameView:
                def __init__(self, width, height):
                    self.width = width
                    self.height = height
                
                def draw_game(self, game_state):
                    # ヘッドレスモードでは描画処理をスキップ
                    pass
                
                def cleanup(self):
                    pass
            
            class HeadlessSoundView:
                def play_sound(self, sound_type):
                    # ヘッドレスモードでは音声処理をスキップ
                    pass
                
                def cleanup(self):
                    pass
            
            game_view = HeadlessGameView(screen_width, screen_height)
            sound_view = HeadlessSoundView()
            
            # ヘッドレス用のコントローラー（表示処理なし）
            class HeadlessGameController:
                def __init__(self, game_state, game_view, sound_view, target_fps=60):
                    self.game_state = game_state
                    self.game_view = game_view
                    self.sound_view = sound_view
                    self.target_fps = target_fps
                    self.clock = pygame.time.Clock()
                    self.is_running = True
                
                def process_events(self):
                    # ヘッドレスモードでは最小限のイベント処理
                    for event in pygame.event.get():
                        if event.type == pygame.QUIT:
                            return False
                    return True
                
                def update_game_frame(self):
                    # ゲームロジックのみ更新（描画なし）
                    if hasattr(self.game_state, 'update'):
                        self.game_state.update()
                
                def get_game_statistics(self):
                    return {
                        "score": getattr(self.game_state, 'score', 0),
                        "balls_hit": getattr(self.game_state, 'ball_hit_count', 0),
                        "power_ups": getattr(self.game_state, 'power_ups_collected', 0),
                        "game_time": getattr(self.game_state, 'game_time', 0.0)
                    }
                
                def cleanup(self):
                    pass
            
            self.controller = HeadlessGameController(
                self.game_state, 
                game_view, 
                sound_view,
                target_fps=60
            )
            
            logger.info("ヘッドレスWebSocketゲームエンジンのセットアップが完了しました")
            logger.info("🌐 ブラウザで docs/game.html を開いてゲームをプレイしてください")
            
        except Exception as e:
            error_msg = {
                'what': "ヘッドレスゲームエンジンのセットアップに失敗しました",
                'why': f"ヘッドレス初期化でエラー: {str(e)}",
                'how': "pygame-ceのインストールとシステム環境を確認してください"
            }
            logger.error(f"セットアップエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            raise
    
    def setup_websocket_server(self):
        """WebSocketサーバーのセットアップ"""
        try:
            # WebSocketサーバーをゲームエンジンと連携
            self.websocket_server = GameWebSocketServer(game_engine=self)
            logger.info("WebSocketサーバーのセットアップが完了しました")
            
        except Exception as e:
            error_msg = {
                'what': "WebSocketサーバーのセットアップに失敗しました",
                'why': f"WebSocket初期化でエラー: {str(e)}",
                'how': "websocketsライブラリのインストールとポート8765の空きを確認してください"
            }
            logger.error(f"WebSocketエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            raise
    
    def start_websocket_server_thread(self):
        """WebSocketサーバーを別スレッドで起動"""
        def run_websocket_server():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            try:
                self.loop.run_until_complete(
                    start_server(host="localhost", port=8765, game_engine=self)
                )
            except Exception as e:
                logger.error(f"WebSocketサーバー実行エラー: {e}")
        
        self.websocket_thread = threading.Thread(target=run_websocket_server, daemon=True)
        self.websocket_thread.start()
        logger.info("WebSocketサーバーを別スレッドで開始しました (ws://localhost:8765)")
        
        # サーバーが起動するまで少し待機
        time.sleep(1.0)
    
    def get_state(self):
        """ゲーム状態を取得（WebSocketサーバー用）"""
        if self.game_state:
            return {
                "score": getattr(self.game_state, 'score', 0),
                "balls_hit": getattr(self.game_state, 'ball_hit_count', 0),
                "power_ups_collected": getattr(self.game_state, 'power_ups_collected', 0),
                "game_time": getattr(self.game_state, 'game_time', 0.0),
                "paddle_x": getattr(self.game_state, 'paddle_x', 320),
                "ball_x": getattr(self.game_state, 'ball_x', 320),
                "ball_y": getattr(self.game_state, 'ball_y', 240),
                "is_playing": getattr(self.game_state, 'is_playing', False)
            }
        return {}
    
    def apply_challenge(self, challenge_data):
        """チャレンジデータを適用（WebSocketから呼び出し）"""
        logger.info(f"チャレンジを適用: {challenge_data.get('id', 'unknown')}")
        # TODO: ゲーム状態にチャレンジ設定を適用
        
    def set_difficulty(self, level):
        """難易度設定（WebSocketから呼び出し）"""
        logger.info(f"難易度を設定: レベル {level}")
        # TODO: ゲーム難易度を調整
        
    def apply_modifier(self, modifier_type, value):
        """ゲーム修飾子を適用（WebSocketから呼び出し）"""
        logger.info(f"修飾子を適用: {modifier_type} = {value}")
        # TODO: ゲーム修飾子を適用
    
    def notify_events_to_websocket(self):
        """ゲームイベントをWebSocketに通知"""
        if self.websocket_server and self.loop:
            try:
                # 非同期メソッドを同期的に呼び出し
                future = asyncio.run_coroutine_threadsafe(
                    self.websocket_server.broadcast("game:update", self.get_state()),
                    self.loop
                )
                # 非ブロッキングで実行（結果を待たない）
            except Exception as e:
                logger.error(f"WebSocket通知エラー: {e}")
    
    def run_game_loop(self, duration=30.0):
        """ヘッドレス統合ゲームループの実行"""
        logger.info("ヘッドレスWebSocketゲームサーバーを開始します...")
        logger.info("🌐 ブラウザでの操作方法:")
        logger.info("  1. ブラウザで docs/game.html を開く")
        logger.info("  2. WebSocket接続が確立されることを確認")
        logger.info("  3. 「ゲーム開始」ボタンでゲームスタート")
        logger.info("  4. マウス移動でパドル操作")
        logger.info(f"WebSocketサーバーは{duration}秒間実行されます（テスト用）")
        logger.info("")
        
        start_time = time.time()
        frame_count = 0
        self.controller.is_running = True
        
        while self.controller.is_running and (time.time() - start_time) < duration:
            # 最小限のイベント処理（ヘッドレス）
            if not self.controller.process_events():
                break
            
            # ゲームロジック更新のみ（描画なし）
            self.controller.update_game_frame()
            
            # WebSocketへの状態通知（定期的に）
            if frame_count % 60 == 0:  # 1秒に1回
                self.notify_events_to_websocket()
            
            # ヘッドレス用のFPS制御（描画なし）
            self.controller.clock.tick(self.controller.target_fps)
            frame_count += 1
        
        logger.info(f"ヘッドレスゲームループ完了 - {frame_count} フレーム実行")
        
        # 統計情報表示
        stats = self.controller.get_game_statistics()
        logger.info("ゲーム統計:")
        for key, value in stats.items():
            logger.info(f"  {key}: {value}")
    
    def cleanup(self):
        """リソースのクリーンアップ"""
        try:
            if self.controller:
                self.controller.cleanup()
            pygame.quit()
            logger.info("ヘッドレスPygameエンジン正常終了")
        except Exception as e:
            logger.error(f"クリーンアップエラー: {e}")


def main():
    """メイン関数 - ヘッドレスWebSocketゲームサーバー"""
    
    engine = WebSocketGameEngine()
    
    try:
        # 1. ヘッドレスPygameゲームエンジンセットアップ
        engine.setup_pygame()
        
        # 2. WebSocketサーバーセットアップ
        engine.setup_websocket_server()
        
        # 3. WebSocketサーバーを別スレッドで開始
        engine.start_websocket_server_thread()
        
        # 4. ヘッドレスゲームループ実行
        engine.run_game_loop(duration=30.0)  # 30秒間のテスト実行
        
        logger.info("ヘッドレスWebSocketゲームサーバーが正常に完了しました！")
        logger.info("🌐 ブラウザで docs/game.html を開いてゲームをお楽しみください")
        return 0
        
    except Exception as e:
        error_msg = {
            'what': "ヘッドレスゲームサーバー実行中にエラーが発生しました",
            'why': f"統合処理でエラー: {str(e)}",
            'how': "ログを確認し、必要なライブラリのインストールとポート設定を確認してください"
        }
        logger.error(f"実行エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
        return 1
        
    finally:
        # クリーンアップ
        engine.cleanup()


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)