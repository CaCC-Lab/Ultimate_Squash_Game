import tkinter as tk
from tkinter import messagebox
import random
import platform
import math
import json
from datetime import datetime
import os

class GameEngine:
    def __init__(self):
        self.win = tk.Tk()
        self.setup_window()
        self.setup_game_variables()
        self.setup_ui()
        self.bind_events()

    def setup_window(self):
        """ウィンドウの初期設定"""
        self.win.title("Ultimate Squash Game")
        self.win.geometry("800x480")
        
        # メインキャンバス
        self.cv = tk.Canvas(self.win, width=640, height=480)
        self.cv.pack(side=tk.LEFT)

    def setup_game_variables(self):
        """ゲーム変数の初期設定"""
        self.is_gameover = False
        self.point = 0
        self.level = 1
        self.combo = 0
        self.paused = False
        
        # ボール設定
        self.balls = [{
            'x': 320,
            'y': 250,
            'dx': 15,
            'dy': -15,
            'size': 10,
            'color': 'red'
        }]
        
        # ラケット設定
        self.racket_x = 270
        self.racket_size = 100
        self.base_racket_size = 100
        
        # ゲームスピード
        self.speed = 50

    def setup_ui(self):
        """UI要素のセットアップ"""
        # サイドパネル
        self.side_panel = tk.Frame(self.win)
        self.side_panel.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 難易度選択
        self.difficulty = tk.StringVar(value="normal")
        self.create_difficulty_selector()
        
        # サウンド設定
        self.sound_enabled = tk.BooleanVar(value=True)
        self.create_sound_controls()
        
        # スコア表示
        self.create_score_display()

    def create_difficulty_selector(self):
        """難易度選択UIの作成"""
        diff_frame = tk.LabelFrame(self.side_panel, text="Difficulty", padx=10, pady=5)
        diff_frame.pack(pady=10, padx=5, fill=tk.X)
        
        difficulties = [("Easy", "easy"), ("Normal", "normal"), ("Hard", "hard")]
        for text, value in difficulties:
            tk.Radiobutton(diff_frame, text=text, variable=self.difficulty, 
                          value=value).pack(anchor=tk.W)

    def create_sound_controls(self):
        """サウンド設定UIの作成"""
        sound_frame = tk.LabelFrame(self.side_panel, text="Sound", padx=10, pady=5)
        sound_frame.pack(pady=10, padx=5, fill=tk.X)
        
        tk.Checkbutton(sound_frame, text="Sound Effects", 
                      variable=self.sound_enabled).pack(anchor=tk.W)

    def create_score_display(self):
        """スコア表示の作成"""
        self.score_label = tk.Label(self.side_panel, text="Score: 0", 
                                  font=("Arial", 14, "bold"))
        self.score_label.pack(pady=10)
        
        self.combo_label = tk.Label(self.side_panel, text="Combo: 0", 
                                  font=("Arial", 12))
        self.combo_label.pack(pady=5)

    def bind_events(self):
        """イベントのバインド"""
        self.win.bind('<Motion>', self.motion)
        self.win.bind('<Button>', self.click)
        self.win.bind('<space>', self.toggle_pause)

    def motion(self, event):
        """マウス移動イベントの処理"""
        if not self.is_gameover and not self.paused:
            self.racket_x = max(0, min(640 - self.racket_size, event.x))

    def click(self, event):
        """クリックイベントの処理"""
        if event.num == 1:
            self.init_game()

    def toggle_pause(self, event=None):
        """ポーズ切り替え"""
        self.paused = not self.paused
        self.win.title("Game Paused" if self.paused else "Ultimate Squash Game")

    def game_loop(self):
        """ゲームループ"""
        if not self.paused:
            self.update_game_state()
        self.draw_game()
        self.win.after(self.speed, self.game_loop)

    def update_game_state(self):
        """ゲーム状態の更新"""
        if self.is_gameover:
            return

        for ball in self.balls[:]:
            self.update_ball_position(ball)

    def update_ball_position(self, ball):
        """ボールの位置更新"""
        # 壁との衝突
        if ball['x'] + ball['dx'] < 0 or ball['x'] + ball['dx'] > 640:
            ball['dx'] *= -1
            self.play_sound('wall')

        if ball['y'] + ball['dy'] < 0:
            ball['dy'] *= -1
            self.play_sound('wall')

        # ラケットとの衝突
        if self.check_racket_collision(ball):
            return

        # 位置の更新
        if 0 <= ball['x'] + ball['dx'] <= 640:
            ball['x'] += ball['dx']
        if 0 <= ball['y'] + ball['dy'] <= 480:
            ball['y'] += ball['dy']

    def check_racket_collision(self, ball):
        """ラケットとの衝突チェック"""
        if ball['y'] + ball['dy'] > 470 and (
            self.racket_x <= ball['x'] + ball['dx'] <= self.racket_x + self.racket_size
        ):
            ball['dy'] *= -1
            self.handle_successful_hit()
            return True
        elif ball['y'] + ball['dy'] >= 480:
            self.handle_miss(ball)
            return True
        return False

    def handle_successful_hit(self):
        """成功時のヒット処理"""
        self.combo += 1
        bonus = math.floor(self.combo / 5)
        self.point += 10 * (1 + bonus)
        self.update_score_display()
        self.play_sound('hit')

    def handle_miss(self, ball):
        """ミス時の処理"""
        self.balls.remove(ball)
        self.combo = 0
        if len(self.balls) == 0:
            self.game_over()
        self.play_sound('miss')

    def update_score_display(self):
        """スコア表示の更新"""
        self.score_label.config(text=f"Score: {self.point}")
        self.combo_label.config(text=f"Combo: {self.combo}")

    def draw_game(self):
        """ゲーム画面の描画"""
        self.cv.delete('all')
        self.draw_background()
        self.draw_balls()
        self.draw_racket()

    def draw_background(self):
        """背景の描画"""
        self.cv.create_rectangle(0, 0, 640, 480, fill="#F0F0F0", width=0)

    def draw_balls(self):
        """ボールの描画"""
        for ball in self.balls:
            self.cv.create_oval(
                ball['x'] - ball['size'], ball['y'] - ball['size'],
                ball['x'] + ball['size'], ball['y'] + ball['size'],
                fill=ball['color']
            )

    def draw_racket(self):
        """ラケットの描画"""
        self.cv.create_rectangle(
            self.racket_x, 470,
            self.racket_x + self.racket_size, 480,
            fill="yellow"
        )

    def play_sound(self, sound_type):
        """サウンド再生"""
        if not self.sound_enabled.get():
            return
            
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

    def game_over(self):
        """ゲームオーバー処理"""
        self.is_gameover = True
        self.win.title(f"Game Over! Final Score: {self.point}")

    def init_game(self):
        """ゲームの初期化"""
        self.setup_game_variables()
        self.win.title("Ultimate Squash Game")

    def start(self):
        """ゲーム開始"""
        self.game_loop()
        self.win.mainloop()
