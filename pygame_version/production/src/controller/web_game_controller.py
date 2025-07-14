"""
Web環境対応ゲームコントローラー（JavaScript連携）
個人開発規約遵守:
- TDD必須: Web Controller操作のテスト
- モック禁止: 実際のWeb環境でのイベント処理確認
- エラー3要素: Web Controller操作時のエラーハンドリング検証
技術移行:
- Pygame event → JavaScript event対応
- 既存MVCパターンの移植
- Pyodide環境最適化
"""
import json
import time
from typing import Optional, Dict, Any, Callable
from model.pygame_game_state import PygameGameState
from view.web_game_view import WebCanvasView, WebSoundView
class WebControllerError(Exception):
    """Web Controller専用例外クラス"""
    def __init__(self, message: str, error_code: str = "WEB_CONTROLLER_ERROR"):
        super().__init__(message)
        self.error_code = error_code
class WebGameController:
    """
    Web環境対応ゲームController（MVC層協調管理）
    責務:
    - JavaScript イベント処理とGameStateメソッドのバインド
    - GameStateとWebCanvasViewの協調管理
    - Web環境でのゲームループ制御
    - ブラウザユーザー入力の管理
    """
    def __init__(self,
                 game_state: PygameGameState,
                 canvas_view: WebCanvasView,
                 sound_view: Optional[WebSoundView] = None,
                 target_fps: float = 60.0):
        """
        Web Controllerの初期化
        Args:
            game_state: PygameGameState - 管理するゲーム状態
            canvas_view: WebCanvasView - 管理するCanvasビュー
            sound_view: WebSoundView - サウンドビュー（オプション）
            target_fps: float - 目標FPS（Web環境では制限的）
        """
        self.game_state = game_state
        self.canvas_view = canvas_view
        self.sound_view = sound_view or WebSoundView(sound_enabled=False)
        self.target_fps = target_fps
        self.frame_interval = 1.0 / target_fps
        self.last_frame_time = 0.0
        self.frame_count = 0
        self.is_running = False
        self.is_paused = False
        self.js_callbacks: Dict[str, Callable] = {}
        self._setup_observers()
        self._initial_draw()
        print(f"WebGameController初期化完了 - FPS: {target_fps}")
    def _setup_observers(self):
        """Observer関係の初期設定"""
        try:
            self.game_state.add_observer(self.canvas_view)
        except Exception as e:
            raise WebControllerError(
                f"Observer設定に失敗しました: {str(e)}",
                "OBSERVER_SETUP_ERROR"
            )
    def _initial_draw(self):
        """初期描画の実行"""
        try:
            self.canvas_view.on_game_state_changed(self.game_state)
        except Exception as e:
            print(f"初期描画警告: {str(e)} - ゲーム続行")
    def handle_mouse_motion(self, mouse_x: float):
        """
        マウス移動イベント処理（JavaScript連携）
        Args:
            mouse_x: float - マウスのX座標（Canvas座標系）
        """
        try:
            if self.game_state.is_gameover or self.game_state.paused:
                return
            game_x = self._canvas_to_game_x(mouse_x)
            self.game_state.update_racket_position(game_x)
        except Exception as e:
            error_msg = {
                'what': "マウス移動処理に失敗しました",
                'why': f"ラケット位置更新でエラーが発生: {str(e)}",
                'how': "ブラウザのマウス座標が正しく取得されているか確認してください"
            }
            print(f"マウス処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    def handle_mouse_click(self, button: int):
        """
        マウスクリックイベント処理（JavaScript連携）
        Args:
            button: int - クリックボタン（0=左, 1=中, 2=右）
        """
        try:
            if button == 0:
                self.game_state.reset_game()
                self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
        except Exception as e:
            error_msg = {
                'what': "クリック処理に失敗しました",
                'why': f"ゲームリセットでエラーが発生: {str(e)}",
                'how': "再度クリックしてください"
            }
            print(f"クリック処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    def handle_key_press(self, key_code: str):
        """
        キー押下イベント処理（JavaScript連携）
        Args:
            key_code: str - 押下されたキーコード（"Space", "KeyR", "Escape"など）
        """
        try:
            if key_code == "Space":
                self.toggle_pause()
            elif key_code == "KeyR":
                self.game_state.reset_game()
            elif key_code == "Escape":
                self.stop_game()
        except Exception as e:
            error_msg = {
                'what': "キー処理に失敗しました",
                'why': f"キーイベント処理でエラーが発生: {str(e)}",
                'how': "キー操作を再試行してください"
            }
            print(f"キー処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    def toggle_pause(self):
        """ポーズ状態切り替え"""
        try:
            self.game_state.toggle_pause()
            if self.game_state.paused:
                self.canvas_view.update_window_title("Game Paused - Web Edition")
            else:
                self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
        except Exception as e:
            error_msg = {
                'what': "ポーズ切り替えに失敗しました",
                'why': f"ポーズ状態更新でエラーが発生: {str(e)}",
                'how': "スペースキーを再度押してください"
            }
            print(f"ポーズエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    def update_game_frame(self) -> bool:
        """
        1フレーム分のゲーム更新（Web環境用）
        Returns:
            bool: 更新が実行された場合True
        """
        try:
            current_time = time.time()
            if current_time - self.last_frame_time < self.frame_interval:
                return False
            self.last_frame_time = current_time
            self.frame_count += 1
            if self.game_state.paused or self.game_state.is_gameover:
                return True
            for ball in self.game_state.balls[:]:
                collision_occurred = self.game_state.update_ball_position(ball)
                if collision_occurred:
                    self.sound_view.play_sound('hit')
            return True
        except Exception as e:
            error_msg = {
                'what': "ゲームフレーム更新に失敗しました",
                'why': f"物理演算処理でエラーが発生: {str(e)}",
                'how': "ブラウザを再読み込みしてください"
            }
            print(f"フレーム更新エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
    def _canvas_to_game_x(self, canvas_x: float) -> float:
        """
        Canvas座標をゲーム座標に変換
        Args:
            canvas_x: float - Canvas X座標
        Returns:
            float: ゲーム X座標
        """
        return canvas_x
    def start_game_loop(self):
        """
        ゲームループ開始（Web環境用）
        Note: Web環境では実際のループはJavaScript側のrequestAnimationFrameで実行
        """
        self.is_running = True
        self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
        print("Web環境ゲームループ開始準備完了")
        print("実際のループはJavaScript側で実行されます")
    def stop_game(self):
        """ゲーム停止"""
        self.is_running = False
        print("ゲーム停止")
    def cleanup(self):
        """リソースクリーンアップ"""
        try:
            self.game_state.remove_observer(self.canvas_view)
            self.is_running = False
            self.canvas_view.reset_frame_data()
            print("WebGameControllerのクリーンアップ完了")
        except Exception as e:
            print(f"クリーンアップ警告: {str(e)}")
    def get_current_fps(self) -> float:
        """現在のFPS計算"""
        if self.frame_count > 0:
            elapsed = time.time() - self.last_frame_time
            return 1.0 / elapsed if elapsed > 0 else 0.0
        return 0.0
    def get_javascript_interface(self) -> str:
        """
        JavaScript連携用の完全なインターフェースデータを取得
        Returns:
            str: JSON形式の統合データ
        """
        try:
            interface_data = {
                'canvas_data': json.loads(self.canvas_view.get_javascript_interface_data()),
                'sound_commands': json.loads(self.sound_view.get_sound_commands_json()),
                'controller_stats': self.get_game_statistics(),
                'frame_count': self.frame_count,
                'is_running': self.is_running,
                'target_fps': self.target_fps
            }
            return json.dumps(interface_data, ensure_ascii=False, indent=2)
        except Exception as e:
            error_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"データ統合処理でエラー: {str(e)}",
                    'how': "各コンポーネントの状態を個別に確認してください"
                }
            }
            return json.dumps(error_data, ensure_ascii=False)
    def get_game_statistics(self) -> Dict[str, Any]:
        """ゲーム統計情報取得"""
        return {
            'fps': self.get_current_fps(),
            'frame_interval': self.frame_interval,
            'target_fps': self.target_fps,
            'is_running': self.is_running,
            'game_paused': self.game_state.paused,
            'game_over': self.game_state.is_gameover,
            'score': self.game_state.score.point,
            'combo': self.game_state.score.combo,
            'balls_count': len(self.game_state.balls),
            'frame_count': self.frame_count,
            'canvas_size': self.canvas_view.get_canvas_size(),
            'performance_stats': self.canvas_view.get_performance_stats()
        }
    def register_js_callback(self, event_type: str, callback: Callable):
        """
        JavaScript連携用コールバック登録
        Args:
            event_type: str - イベントタイプ
            callback: Callable - コールバック関数
        """
        self.js_callbacks[event_type] = callback
    def execute_js_callback(self, event_type: str, data: Any = None):
        """
        JavaScript連携用コールバック実行
        Args:
            event_type: str - イベントタイプ
            data: Any - コールバックデータ
        """
        if event_type in self.js_callbacks:
            try:
                self.js_callbacks[event_type](data)
            except Exception as e:
                print(f"JSコールバック実行エラー ({event_type}): {str(e)}")