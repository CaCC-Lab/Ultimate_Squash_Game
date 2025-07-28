"""
Pygame-CE対応ゲーム表示View（View層）

個人開発規約遵守:
- TDD必須: View更新ロジックのテスト
- モック禁止: 実際のPygame描画検証
- エラー3要素: 描画エラー時の適切なメッセージ

技術移行:
- Tkinter → Pygame-CE Surface描画
- 既存Observerパターンの移植
- MVCアーキテクチャ維持
"""

import pygame
from typing import Tuple, Optional, List
from src.model.pygame_game_state import PygameGameState, PygameGameStateObserver


class PygameGameView(PygameGameStateObserver):
    """
    Pygame-CE対応ゲーム描画View（UI層）
    Pygame Surfaceを使用したゲーム画面の描画とUI更新を担当
    """
    
    def __init__(self, screen: pygame.Surface, width: int = 640, height: int = 480):
        """
        Viewの初期化
        
        Args:
            screen: pygame.Surface - 描画対象のScreen Surface
            width: int - 画面幅
            height: int - 画面高さ
        """
        self.screen = screen
        self.width = width
        self.height = height
        
        # フォントの初期化
        pygame.font.init()
        self.font_large = pygame.font.Font(None, 48)
        self.font_medium = pygame.font.Font(None, 32)
        self.font_small = pygame.font.Font(None, 24)
        
        # 色設定（RGB）
        self.colors = {
            'background': (240, 240, 240),  # Light gray
            'racket': (255, 255, 0),        # Yellow
            'ball_default': (255, 0, 0),    # Red
            'text_black': (0, 0, 0),        # Black
            'text_red': (255, 0, 0),        # Red
            'text_blue': (0, 0, 255),       # Blue
            'text_white': (255, 255, 255)   # White
        }
        
        # 現在のゲーム状態（表示用）
        self.current_score = 0
        self.current_combo = 0
    
    def on_game_state_changed(self, game_state: PygameGameState):
        """
        ゲーム状態変更通知（Observerパターン）
        
        Args:
            game_state: PygameGameState - 変更されたゲーム状態
        """
        try:
            self.draw_game(game_state)
            self.current_score = game_state.score.point
            self.current_combo = game_state.score.combo
            pygame.display.flip()  # 画面更新
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': f"ゲーム画面の描画に失敗しました",
                'why': f"Pygame描画処理でエラーが発生: {str(e)}",
                'how': "ゲームを再起動してください。問題が続く場合は開発者に連絡してください"
            }
            print(f"描画エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            # 最低限の描画を試行
            self._safe_clear_screen()
    
    def draw_game(self, game_state: PygameGameState):
        """
        ゲーム全体の描画
        
        Args:
            game_state: PygameGameState - 描画するゲーム状態
        """
        # 画面クリア
        self.screen.fill(self.colors['background'])
        
        # ゲーム要素描画
        self._draw_balls(game_state.balls)
        if game_state.racket:
            self._draw_racket(game_state.racket)
        
        # UI描画
        self._draw_score_display(game_state.score)
        
        # ゲーム状態に応じた表示
        if game_state.paused:
            self._draw_pause_message()
        elif game_state.is_gameover:
            self._draw_game_over_message(game_state.score)
    
    def _draw_balls(self, balls: List):
        """
        ボールの描画
        
        Args:
            balls: List[PygameBall] - 描画するボールのリスト
        """
        for ball in balls:
            pygame.draw.circle(
                self.screen,
                ball.color,
                (int(ball.x), int(ball.y)),
                ball.radius
            )
    
    def _draw_racket(self, racket):
        """
        ラケットの描画
        
        Args:
            racket: PygameRacket - 描画するラケット
        """
        racket_rect = pygame.Rect(
            int(racket.x),
            int(racket.y),
            racket.size,
            racket.height
        )
        pygame.draw.rect(
            self.screen,
            racket.color,
            racket_rect
        )
    
    def _draw_score_display(self, score):
        """
        スコア表示の描画
        
        Args:
            score: PygameScore - 表示するスコア
        """
        try:
            # スコア文字列作成
            score_text = f"Score: {score.point}"
            combo_text = f"Combo: {score.combo}"
            level_text = f"Level: {score.level}"
            
            # スコア描画
            score_surface = self.font_medium.render(score_text, True, self.colors['text_black'])
            self.screen.blit(score_surface, (10, 10))
            
            # コンボ描画
            combo_surface = self.font_medium.render(combo_text, True, self.colors['text_black'])
            self.screen.blit(combo_surface, (10, 40))
            
            # レベル描画
            level_surface = self.font_medium.render(level_text, True, self.colors['text_black'])
            self.screen.blit(level_surface, (10, 70))
            
        except Exception as e:
            # スコア表示エラーは画面描画に影響しないよう軽微な警告とする
            print(f"スコア表示更新警告: {str(e)}")
    
    def _draw_pause_message(self):
        """ポーズメッセージの描画"""
        pause_surface = self.font_large.render("PAUSED", True, self.colors['text_red'])
        pause_rect = pause_surface.get_rect(center=(self.width // 2, self.height // 2))
        self.screen.blit(pause_surface, pause_rect)
        
        # 半透明オーバーレイ（オプション）
        overlay = pygame.Surface((self.width, self.height))
        overlay.set_alpha(128)  # 半透明
        overlay.fill((0, 0, 0))
        self.screen.blit(overlay, (0, 0))
        
        # ポーズテキストを再描画（オーバーレイの上に）
        self.screen.blit(pause_surface, pause_rect)
    
    def _draw_game_over_message(self, score):
        """
        ゲームオーバーメッセージの描画
        
        Args:
            score: PygameScore - 最終スコア
        """
        # Game Over メッセージ
        gameover_surface = self.font_large.render("GAME OVER", True, self.colors['text_red'])
        gameover_rect = gameover_surface.get_rect(center=(self.width // 2, self.height // 2 - 40))
        self.screen.blit(gameover_surface, gameover_rect)
        
        # 最終スコア
        final_score_text = f"Final Score: {score.point}"
        final_surface = self.font_medium.render(final_score_text, True, self.colors['text_black'])
        final_rect = final_surface.get_rect(center=(self.width // 2, self.height // 2 + 10))
        self.screen.blit(final_surface, final_rect)
        
        # 再開メッセージ
        restart_text = "Click to restart"
        restart_surface = self.font_small.render(restart_text, True, self.colors['text_blue'])
        restart_rect = restart_surface.get_rect(center=(self.width // 2, self.height // 2 + 40))
        self.screen.blit(restart_surface, restart_rect)
    
    def _safe_clear_screen(self):
        """安全な画面クリア（エラー時の最後の手段）"""
        try:
            self.screen.fill(self.colors['background'])
            
            # エラーメッセージ表示
            error_surface = self.font_medium.render(
                "描画エラーが発生しました",
                True,
                self.colors['text_red']
            )
            error_rect = error_surface.get_rect(center=(self.width // 2, self.height // 2))
            self.screen.blit(error_surface, error_rect)
            
            pygame.display.flip()
        except:
            # これ以上何もできない
            pass
    
    def update_window_title(self, title: str):
        """
        ウィンドウタイトルの更新
        
        Args:
            title: str - 新しいタイトル
        """
        pygame.display.set_caption(title)
    
    def get_screen_size(self) -> Tuple[int, int]:
        """画面サイズの取得"""
        return (self.width, self.height)


class PygameSoundView:
    """
    Pygame-CE対応サウンドView（サウンド担当）
    """
    
    def __init__(self, sound_enabled: bool = True):
        self.sound_enabled = sound_enabled
        
        if sound_enabled:
            try:
                pygame.mixer.init()
                self.sounds = {}
                self._load_sounds()
            except Exception as e:
                print(f"サウンドシステム初期化失敗: {str(e)} - サウンドを無効化します")
                self.sound_enabled = False
    
    def _load_sounds(self):
        """サウンドファイルの読み込み（将来実装）"""
        # TODO: 実際のサウンドファイルの読み込み
        # self.sounds['wall'] = pygame.mixer.Sound('assets/sounds/wall.wav')
        # self.sounds['hit'] = pygame.mixer.Sound('assets/sounds/hit.wav')
        # self.sounds['miss'] = pygame.mixer.Sound('assets/sounds/miss.wav')
        
        # 現在はプレースホルダー
        self.sounds = {
            'wall': None,
            'hit': None,
            'miss': None
        }
    
    def play_sound(self, sound_type: str):
        """
        サウンド再生
        
        Args:
            sound_type: str - サウンドタイプ（'wall', 'hit', 'miss'）
        """
        if not self.sound_enabled:
            return
        
        try:
            # 現在は基本的なbeep音で代替
            if sound_type in self.sounds:
                # TODO: 実際のサウンドファイル再生
                # if self.sounds[sound_type]:
                #     self.sounds[sound_type].play()
                
                # 代替案：システムbeep（macOS対応）
                import sys
                if sys.platform.startswith('darwin'):  # macOS
                    import os
                    if sound_type == 'wall':
                        os.system('afplay /System/Library/Sounds/Pop.aiff 2>/dev/null &')
                    elif sound_type == 'hit':
                        os.system('afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &')
                    elif sound_type == 'miss':
                        os.system('afplay /System/Library/Sounds/Sosumi.aiff 2>/dev/null &')
                        
        except Exception as e:
            print(f"サウンド再生エラー: {str(e)} - サウンドを無効化します")
            self.sound_enabled = False