import tkinter as tk
from tkinter import messagebox
import random
import platform
import math
import json
from datetime import datetime
import os

# JavaScript-Pythonブリッジ用のインポート（Pyodide環境で使用）
try:
    import js
    PYODIDE_ENV = True
except ImportError:
    PYODIDE_ENV = False

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
        
        # ウィークリーチャレンジモード設定
        self.challenge_mode = False
        self.challenge_data = None
        self.challenge_start_time = None
        self.consecutive_hits = 0
        self.max_consecutive_hits = 0
        self.total_hits = 0
        self.misses = 0
        self.game_start_time = None
        self.special_actions_performed = []
        
        # チュートリアルモード設定
        self.tutorial_mode = False
        self.tutorial_step = None
        self.tutorial_validation = {}
        self.pause_ball = False

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
        # チュートリアルモードでボール停止中の場合
        if self.tutorial_mode and self.pause_ball:
            return
            
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
        
        # チャレンジモードでの追跡
        if self.challenge_mode:
            self.consecutive_hits += 1
            self.total_hits += 1
            self.max_consecutive_hits = max(self.max_consecutive_hits, self.consecutive_hits)
            
            # 特殊アクションの検出
            if self.combo >= 10:
                self.record_special_action('perfect_combo')
            if bonus > 0:
                self.record_special_action('bonus_achieved')
                
            # 進捗を報告
            self.report_challenge_progress()

    def handle_miss(self, ball):
        """ミス時の処理"""
        self.balls.remove(ball)
        self.combo = 0
        if len(self.balls) == 0:
            self.game_over()
        self.play_sound('miss')
        
        # チャレンジモードでの追跡
        if self.challenge_mode:
            self.consecutive_hits = 0  # 連続ヒットをリセット
            self.misses += 1
            
            # 進捗を報告
            self.report_challenge_progress()

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
        
        # チャレンジモードでの最終結果報告
        if self.challenge_mode:
            self.report_challenge_progress()

    def init_game(self):
        """ゲームの初期化"""
        self.setup_game_variables()
        self.win.title("Ultimate Squash Game")
        
        # チャレンジモードが有効な場合、初期化
        if self.challenge_mode and self.challenge_data:
            self.init_challenge_mode()

    # ウィークリーチャレンジ統合機能
    def init_challenge_mode(self):
        """チャレンジモードの初期化"""
        if not self.challenge_data:
            return
            
        self.challenge_start_time = datetime.now()
        self.game_start_time = datetime.now()
        self.consecutive_hits = 0
        self.max_consecutive_hits = 0
        self.total_hits = 0
        self.misses = 0
        self.special_actions_performed = []
        
        # チャレンジタイプに応じた初期設定
        challenge_type = self.challenge_data.get('type', '')
        if challenge_type == 'score':
            # スコアチャレンジ用の設定
            pass
        elif challenge_type == 'consecutive_hits':
            # 連続ヒットチャレンジ用の設定
            pass
        elif challenge_type == 'time_survival':
            # 生存時間チャレンジ用の設定
            pass
        elif challenge_type == 'special_action':
            # 特殊アクションチャレンジ用の設定
            pass
        
        # JavaScriptにチャレンジ開始を通知
        self.report_challenge_progress()

    def get_challenge_progress_data(self):
        """現在のチャレンジ進捗データを取得"""
        if not self.challenge_mode or not self.challenge_data:
            return None
            
        now = datetime.now()
        elapsed_time = (now - self.game_start_time).total_seconds() if self.game_start_time else 0
        
        challenge_type = self.challenge_data.get('type', '')
        target = self.challenge_data.get('target', 0)
        
        progress_data = {
            'type': challenge_type,
            'target': target,
            'current': 0,
            'elapsed_time': elapsed_time,
            'time_limit': self.challenge_data.get('timeLimit', 120),
            'completed': False,
            'failed': False
        }
        
        # チャレンジタイプ別の進捗計算
        if challenge_type == 'score':
            progress_data['current'] = self.point
            progress_data['completed'] = self.point >= target
            
        elif challenge_type == 'consecutive_hits':
            progress_data['current'] = self.max_consecutive_hits
            progress_data['completed'] = self.max_consecutive_hits >= target
            
        elif challenge_type == 'time_survival':
            progress_data['current'] = elapsed_time
            progress_data['completed'] = elapsed_time >= target and not self.is_gameover
            progress_data['failed'] = self.is_gameover and elapsed_time < target
            
        elif challenge_type == 'special_action':
            # 特殊アクションの実行確認
            action_count = len(self.special_actions_performed)
            progress_data['current'] = action_count
            progress_data['completed'] = target in self.special_actions_performed
        
        # 時間制限チェック
        if progress_data['time_limit'] > 0 and elapsed_time >= progress_data['time_limit']:
            if not progress_data['completed']:
                progress_data['failed'] = True
        
        return progress_data

    def report_challenge_progress(self):
        """JavaScriptにチャレンジ進捗を報告"""
        if not PYODIDE_ENV or not self.challenge_mode:
            return
            
        progress_data = self.get_challenge_progress_data()
        if progress_data is None:
            return
            
        try:
            # ゲーム状態データも含める
            game_data = {
                'score': self.point,
                'combo': self.combo,
                'consecutive_hits': self.consecutive_hits,
                'max_consecutive_hits': self.max_consecutive_hits,
                'total_hits': self.total_hits,
                'misses': self.misses,
                'is_gameover': self.is_gameover,
                'challenge_progress': progress_data
            }
            
            # JavaScriptの関数を呼び出し
            if hasattr(js, 'updateChallengeProgress'):
                js.updateChallengeProgress(json.dumps(game_data))
        except Exception as e:
            print(f"Error reporting challenge progress: {e}")

    def set_challenge_mode(self, challenge_data):
        """外部からチャレンジモードを設定"""
        self.challenge_mode = True
        self.challenge_data = challenge_data
        print(f"Challenge mode set: {challenge_data}")

    def disable_challenge_mode(self):
        """チャレンジモードを無効化"""
        self.challenge_mode = False
        self.challenge_data = None
        self.challenge_start_time = None
        print("Challenge mode disabled")

    def record_special_action(self, action_type):
        """特殊アクションの記録"""
        if self.challenge_mode and action_type not in self.special_actions_performed:
            self.special_actions_performed.append(action_type)
            print(f"Special action recorded: {action_type}")
            self.report_challenge_progress()

    def set_tutorial_mode(self, enabled, step=None):
        """チュートリアルモードの設定"""
        self.tutorial_mode = enabled
        self.tutorial_step = step
        
        if enabled:
            # チュートリアル用の簡易設定
            self.difficulty.set('easy')
            self.speed = 80  # 遅めのスピード
            
            # ステップに応じた設定
            if step == 'practice_racket':
                # ボールを一時停止
                self.pause_ball = True
            elif step == 'practice_hit':
                # ボールの速度を落とす
                for ball in self.balls:
                    ball['dx'] = ball['dx'] * 0.5
                    ball['dy'] = ball['dy'] * 0.5
            elif step == 'practice_combo':
                # コンボを狙いやすくする
                self.racket_size = 150  # ラケットを大きく
        else:
            # 通常設定に戻す
            self.pause_ball = False
            self.racket_size = self.base_racket_size
            
        print(f"Tutorial mode set: enabled={enabled}, step={step}")

    def start(self):
        """ゲーム開始"""
        self.game_loop()
        self.win.mainloop()


# グローバルゲーム状態管理クラス（JavaScript-Pythonブリッジ用）
class GameState:
    def __init__(self):
        self.game_engine = None
        self.challenge_mode = False
        self.challenge_data = None
        
    def set_game_engine(self, engine):
        """ゲームエンジンのインスタンスを設定"""
        self.game_engine = engine
        
    def enable_challenge_mode(self, challenge_data_json):
        """チャレンジモードを有効化"""
        try:
            if isinstance(challenge_data_json, str):
                challenge_data = json.loads(challenge_data_json)
            else:
                challenge_data = challenge_data_json
                
            self.challenge_mode = True
            self.challenge_data = challenge_data
            
            if self.game_engine:
                self.game_engine.set_challenge_mode(challenge_data)
                
            print(f"Challenge mode enabled: {challenge_data}")
            return True
        except Exception as e:
            print(f"Error enabling challenge mode: {e}")
            return False
            
    def disable_challenge_mode(self):
        """チャレンジモードを無効化"""
        self.challenge_mode = False
        self.challenge_data = None
        
        if self.game_engine:
            self.game_engine.disable_challenge_mode()
            
        print("Challenge mode disabled")
        return True
        
    def get_challenge_progress(self):
        """現在のチャレンジ進捗を取得"""
        if self.game_engine and self.challenge_mode:
            progress = self.game_engine.get_challenge_progress_data()
            return json.dumps(progress) if progress else None
        return None
        
    def record_special_action(self, action_type):
        """特殊アクションを記録"""
        if self.game_engine and self.challenge_mode:
            self.game_engine.record_special_action(action_type)
            return True
        return False
        
    def set_tutorial_mode(self, enabled):
        """チュートリアルモードを有効化/無効化"""
        if self.game_engine:
            self.game_engine.set_tutorial_mode(enabled)
            return True
        return False
        
    def set_tutorial_step(self, step):
        """チュートリアルステップを設定"""
        if self.game_engine:
            self.game_engine.set_tutorial_mode(True, step)
            return True
        return False
        
    def get_game_state(self):
        """現在のゲーム状態を取得（チュートリアル用）"""
        if self.game_engine:
            return json.dumps({
                'score': self.game_engine.point,
                'combo': self.game_engine.combo,
                'total_hits': self.game_engine.total_hits,
                'consecutive_hits': self.game_engine.consecutive_hits,
                'max_consecutive_hits': self.game_engine.max_consecutive_hits,
                'is_gameover': self.game_engine.is_gameover,
                'tutorial_mode': self.game_engine.tutorial_mode,
                'tutorial_step': self.game_engine.tutorial_step
            })
        return None

# グローバルインスタンス（JavaScriptからアクセス可能）
game_state = GameState()
