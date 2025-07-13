"""
ゲーム表示View（View層）

個人開発規約遵守:
- TDD必須: View更新ロジックのテスト
- モック禁止: 実際のtkinter描画検証
- エラー3要素: 描画エラー時の適切なメッセージ
"""

import tkinter as tk
from abc import ABC, abstractmethod


class GameObserver(ABC):
    """Observerパターンのインターフェース"""
    
    @abstractmethod
    def on_game_state_changed(self, game_state):
        """ゲーム状態変更時の通知"""
        pass


class GameView(GameObserver):
    """
    ゲーム描画View（UI層）
    tkinterを使用したゲーム画面の描画とUI更新を担当
    """
    
    def __init__(self, canvas, score_label=None, combo_label=None):
        """
        Viewの初期化
        
        Args:
            canvas: tkinter.Canvas - 描画対象のキャンバス
            score_label: tkinter.Label - スコア表示ラベル（オプション）
            combo_label: tkinter.Label - コンボ表示ラベル（オプション）
        """
        self.canvas = canvas
        self.score_label = score_label
        self.combo_label = combo_label
        
        # キャンバスサイズ
        self.width = 640
        self.height = 480
        
        # 色設定
        self.colors = {
            'background': '#F0F0F0',
            'racket': 'yellow',
            'ball_default': 'red'
        }
    
    def on_game_state_changed(self, game_state):
        """
        ゲーム状態変更通知（Observerパターン）
        
        Args:
            game_state: GameState - 変更されたゲーム状態
        """
        try:
            self.draw_game(game_state)
            self.update_score_display(game_state.score)
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': f"ゲーム画面の描画に失敗しました",
                'why': f"描画処理でエラーが発生: {str(e)}",
                'how': "ゲームを再起動してください。問題が続く場合は開発者に連絡してください"
            }
            print(f"描画エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            # 最低限の描画を試行
            self._safe_clear_canvas()
    
    def draw_game(self, game_state):
        """
        ゲーム全体の描画
        
        Args:
            game_state: GameState - 描画するゲーム状態
        """
        # キャンバスクリア
        self.canvas.delete('all')
        
        # 背景描画
        self._draw_background()
        
        # ゲーム要素描画
        self._draw_balls(game_state.balls)
        if game_state.racket:
            self._draw_racket(game_state.racket)
        
        # ゲーム状態に応じた表示
        if game_state.paused:
            self._draw_pause_message()
        elif game_state.is_gameover:
            self._draw_game_over_message(game_state.score)
    
    def _draw_background(self):
        """背景の描画"""
        self.canvas.create_rectangle(
            0, 0, self.width, self.height,
            fill=self.colors['background'],
            width=0
        )
    
    def _draw_balls(self, balls):
        """
        ボールの描画
        
        Args:
            balls: List[Ball] - 描画するボールのリスト
        """
        for ball in balls:
            self.canvas.create_oval(
                ball.x - ball.size, ball.y - ball.size,
                ball.x + ball.size, ball.y + ball.size,
                fill=ball.color,
                outline=''
            )
    
    def _draw_racket(self, racket):
        """
        ラケットの描画
        
        Args:
            racket: Racket - 描画するラケット
        """
        self.canvas.create_rectangle(
            racket.x, racket.y,
            racket.x + racket.size, racket.y + 10,  # 高さ10px
            fill=self.colors['racket'],
            outline=''
        )
    
    def _draw_pause_message(self):
        """ポーズメッセージの描画"""
        self.canvas.create_text(
            self.width // 2, self.height // 2,
            text="PAUSED",
            fill="red",
            font=("Arial", 24, "bold")
        )
    
    def _draw_game_over_message(self, score):
        """
        ゲームオーバーメッセージの描画
        
        Args:
            score: Score - 最終スコア
        """
        self.canvas.create_text(
            self.width // 2, self.height // 2 - 30,
            text="GAME OVER",
            fill="red",
            font=("Arial", 32, "bold")
        )
        
        self.canvas.create_text(
            self.width // 2, self.height // 2 + 20,
            text=f"Final Score: {score.point}",
            fill="black",
            font=("Arial", 16)
        )
        
        self.canvas.create_text(
            self.width // 2, self.height // 2 + 50,
            text="Click to restart",
            fill="blue",
            font=("Arial", 14)
        )
    
    def update_score_display(self, score):
        """
        スコア表示の更新
        
        Args:
            score: Score - 表示するスコア
        """
        try:
            if self.score_label:
                self.score_label.config(text=f"Score: {score.point}")
            
            if self.combo_label:
                self.combo_label.config(text=f"Combo: {score.combo}")
        except Exception as e:
            # スコア表示エラーは画面描画に影響しないよう軽微な警告とする
            print(f"スコア表示更新警告: {str(e)}")
    
    def _safe_clear_canvas(self):
        """安全なキャンバスクリア（エラー時の最後の手段）"""
        try:
            self.canvas.delete('all')
            self.canvas.create_text(
                self.width // 2, self.height // 2,
                text="描画エラーが発生しました",
                fill="red",
                font=("Arial", 16)
            )
        except:
            # これ以上何もできない
            pass
    
    def update_window_title(self, title):
        """
        ウィンドウタイトルの更新
        
        Args:
            title: str - 新しいタイトル
        """
        # Viewの責務として、ウィンドウタイトル更新のインターフェースを提供
        # 実際の更新は親ウィンドウが担当
        pass


class GameSoundView:
    """
    ゲームサウンドView（サウンド担当）
    """
    
    def __init__(self, sound_enabled=True):
        self.sound_enabled = sound_enabled
        
    def play_sound(self, sound_type):
        """
        サウンド再生
        
        Args:
            sound_type: str - サウンドタイプ（'wall', 'hit', 'miss'）
        """
        if not self.sound_enabled:
            return
        
        try:
            import platform
            if platform.system() == 'Windows':
                sounds = {
                    'wall': (1320, 50),
                    'hit': (2000, 50),
                    'miss': (200, 800)
                }
                if sound_type in sounds:
                    import winsound
                    freq, duration = sounds[sound_type]
                    winsound.Beep(freq, duration)
        except ImportError:
            # winsoundが利用できない環境では無音
            pass
        except Exception as e:
            print(f"サウンド再生エラー: {str(e)} - サウンドを無効化します")
            self.sound_enabled = False