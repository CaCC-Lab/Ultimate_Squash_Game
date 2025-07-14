"""
Pygame-CE対応ゲームコントローラー（Controller層）

個人開発規約遵守:
- TDD必須: Controller操作のテスト
- モック禁止: 実際のPygameイベントでテスト
- エラー3要素: Controller操作時のエラーハンドリング検証

技術移行:
- Tkinter event → Pygame event対応
- 既存MVCパターンの移植
- Observerパターン管理継続
"""

import pygame
import time
from typing import Optional
from model.pygame_game_state import PygameGameState
from view.pygame_game_view import PygameGameView, PygameSoundView


class PygameControllerError(Exception):
    """Pygame Controller専用例外クラス"""
    
    def __init__(self, message: str, error_code: str = "CONTROLLER_ERROR"):
        super().__init__(message)
        self.error_code = error_code


class PygameGameController:
    """
    Pygame-CE対応ゲームController（MVC層協調管理）
    
    責務:
    - Pygameイベント処理とGameStateメソッドのバインド
    - GameStateとGameViewの協調管理
    - ゲームループの制御
    - ユーザー入力の管理
    """
    
    def __init__(self, 
                 game_state: PygameGameState, 
                 game_view: PygameGameView,
                 sound_view: Optional[PygameSoundView] = None,
                 target_fps: int = 60):
        """
        Controllerの初期化
        
        Args:
            game_state: PygameGameState - 管理するゲーム状態
            game_view: PygameGameView - 管理するゲームビュー  
            sound_view: PygameSoundView - サウンドビュー（オプション）
            target_fps: int - 目標FPS
        """
        self.game_state = game_state
        self.game_view = game_view
        self.sound_view = sound_view or PygameSoundView(sound_enabled=False)
        self.target_fps = target_fps
        
        # Pygame Clock
        self.clock = pygame.time.Clock()
        
        # ゲームループ制御
        self.is_running = False
        self.frame_delay = 1000 // target_fps  # ミリ秒単位
        
        # Observer登録
        self._setup_observers()
        
        # 初期描画
        self._initial_draw()
    
    def _setup_observers(self):
        """Observer関係の初期設定"""
        try:
            # GameViewをGameStateのObserverとして登録
            self.game_state.add_observer(self.game_view)
            
        except Exception as e:
            raise PygameControllerError(
                f"Observer設定に失敗しました: {str(e)}",
                "OBSERVER_SETUP_ERROR"
            )
    
    def _initial_draw(self):
        """初期描画の実行"""
        try:
            self.game_view.draw_game(self.game_state)
            pygame.display.flip()
        except Exception as e:
            print(f"初期描画警告: {str(e)} - ゲーム続行")
    
    def handle_mouse_motion(self, mouse_x: int):
        """
        マウス移動イベント処理
        
        Args:
            mouse_x: int - マウスのX座標
        """
        try:
            # ゲームオーバーまたはポーズ中は反映しない
            if self.game_state.is_gameover or self.game_state.paused:
                return
            
            # ラケット位置更新
            self.game_state.update_racket_position(float(mouse_x))
            
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "マウス移動処理に失敗しました",
                'why': f"ラケット位置更新でエラーが発生: {str(e)}",
                'how': "マウス操作を再試行してください"
            }
            print(f"マウス処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def handle_mouse_click(self, button: int):
        """
        マウスクリックイベント処理
        
        Args:
            button: int - クリックボタン（1=左クリック）
        """
        try:
            if button == 1:  # 左クリック
                self.game_state.reset_game()
                self.game_view.update_window_title("Ultimate Squash Game - Pygame Edition")
                
        except Exception as e:
            error_msg = {
                'what': "クリック処理に失敗しました",
                'why': f"ゲームリセットでエラーが発生: {str(e)}",
                'how': "再度クリックしてください"
            }
            print(f"クリック処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def handle_key_press(self, key: int):
        """
        キー押下イベント処理
        
        Args:
            key: int - 押下されたキー（pygame.K_*）
        """
        try:
            if key == pygame.K_SPACE:
                self.toggle_pause()
            elif key == pygame.K_r:
                self.game_state.reset_game()
            elif key == pygame.K_ESCAPE:
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
            
            # ウィンドウタイトル更新
            if self.game_state.paused:
                self.game_view.update_window_title("Game Paused - Pygame Edition")
            else:
                self.game_view.update_window_title("Ultimate Squash Game - Pygame Edition")
                
        except Exception as e:
            error_msg = {
                'what': "ポーズ切り替えに失敗しました",
                'why': f"ポーズ状態更新でエラーが発生: {str(e)}",
                'how': "スペースキーを再度押してください"
            }
            print(f"ポーズエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def update_game_frame(self):
        """
        1フレーム分のゲーム更新
        ゲームループから呼び出される
        """
        try:
            # ポーズ中は物理演算をスキップ
            if self.game_state.paused or self.game_state.is_gameover:
                return
            
            # ボール位置更新と衝突判定
            for ball in self.game_state.balls[:]:  # コピーでイテレート（削除対応）
                collision_occurred = self.game_state.update_ball_position(ball)
                
                # サウンド再生（衝突検出時）
                if collision_occurred:
                    # TODO: 衝突タイプに応じたサウンド再生
                    # self.sound_view.play_sound('hit')  # 仮実装
                    pass
            
        except Exception as e:
            error_msg = {
                'what': "ゲームフレーム更新に失敗しました",
                'why': f"物理演算処理でエラーが発生: {str(e)}",
                'how': "ゲームを再起動してください"
            }
            print(f"フレーム更新エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def process_events(self):
        """
        Pygameイベント処理
        
        Returns:
            bool: ゲーム継続フラグ（False=終了）
        """
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            elif event.type == pygame.MOUSEMOTION:
                self.handle_mouse_motion(event.pos[0])
                
            elif event.type == pygame.MOUSEBUTTONDOWN:
                self.handle_mouse_click(event.button)
                
            elif event.type == pygame.KEYDOWN:
                self.handle_key_press(event.key)
        
        return True
    
    def start_game_loop(self):
        """
        メインゲームループ開始
        Pygameのイベントループとゲーム更新を統合
        """
        self.is_running = True
        self.game_view.update_window_title("Ultimate Squash Game - Pygame Edition")
        
        try:
            while self.is_running:
                # イベント処理
                if not self.process_events():
                    break
                
                # ゲーム更新
                self.update_game_frame()
                
                # FPS制御
                self.clock.tick(self.target_fps)
                
        except Exception as e:
            error_msg = {
                'what': "ゲームループでエラーが発生しました",
                'why': f"メインループ処理でエラー: {str(e)}",
                'how': "ゲームを再起動してください"
            }
            print(f"ゲームループエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            
        finally:
            self.cleanup()
    
    def stop_game(self):
        """ゲーム停止"""
        self.is_running = False
    
    def cleanup(self):
        """リソースクリーンアップ"""
        try:
            # Observer削除
            self.game_state.remove_observer(self.game_view)
            
            # Pygame終了処理は呼び出し元で行う
            print("ゲームコントローラーのクリーンアップ完了")
            
        except Exception as e:
            print(f"クリーンアップ警告: {str(e)}")
    
    def get_current_fps(self) -> float:
        """現在のFPS取得"""
        return self.clock.get_fps()
    
    def get_game_statistics(self) -> dict:
        """ゲーム統計情報取得"""
        return {
            'fps': self.get_current_fps(),
            'frame_delay': self.frame_delay,
            'target_fps': self.target_fps,
            'is_running': self.is_running,
            'game_paused': self.game_state.paused,
            'game_over': self.game_state.is_gameover,
            'score': self.game_state.score.point,
            'combo': self.game_state.score.combo,
            'balls_count': len(self.game_state.balls)
        }