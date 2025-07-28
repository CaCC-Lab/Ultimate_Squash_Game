"""
リファクタリングされたゲームエンジン
bundled_game.pyから主要ロジックを抽出・整理
"""

from typing import List, Dict, Any, Optional, Callable, Tuple
import time
import random
from .bundled_components import Ball, Racket, Score, CollisionDetector, GamePhysics


class GameObserver:
    """ゲーム状態観察者インターフェース"""
    
    def on_game_state_changed(self, state: Dict[str, Any]):
        """ゲーム状態変更通知"""
        pass
    
    def on_score_changed(self, score: int, combo: int):
        """スコア変更通知"""
        pass
    
    def on_game_over(self, final_score: int):
        """ゲームオーバー通知"""
        pass


class GameEngine:
    """統合ゲームエンジン"""
    
    def __init__(self, width: int = 600, height: int = 500):
        # キャンバスサイズ
        self.width = width
        self.height = height
        
        # ゲームオブジェクト
        self.balls: List[Ball] = []
        self.racket = Racket(x=width//2, size=80, base_size=80)
        self.score = Score()
        
        # ゲーム状態
        self.game_over = False
        self.paused = False
        self.game_time = 0.0
        self.last_update = time.time()
        
        # 物理演算
        self.physics = GamePhysics()
        self.collision_detector = CollisionDetector()
        
        # 観察者パターン
        self.observers: List[GameObserver] = []
        
        # 難易度設定
        self.difficulty = 1
        self.ball_spawn_interval = 5.0  # 秒
        self.last_ball_spawn = 0.0
        
        # チャレンジ修飾子
        self.modifiers = {
            'speedMultiplier': 1.0,
            'sizeMultiplier': 1.0,
            'gravityMultiplier': 1.0
        }
        
        # 初期ボール生成
        self._spawn_initial_ball()
    
    def add_observer(self, observer: GameObserver):
        """観察者追加"""
        if observer not in self.observers:
            self.observers.append(observer)
    
    def remove_observer(self, observer: GameObserver):
        """観察者削除"""
        if observer in self.observers:
            self.observers.remove(observer)
    
    def _notify_observers(self):
        """観察者に通知"""
        state = self.get_state()
        for observer in self.observers:
            observer.on_game_state_changed(state)
    
    def _notify_score_change(self):
        """スコア変更通知"""
        for observer in self.observers:
            observer.on_score_changed(self.score.value, self.score.combo)
    
    def _notify_game_over(self):
        """ゲームオーバー通知"""
        for observer in self.observers:
            observer.on_game_over(self.score.value)
    
    def update(self, dt: Optional[float] = None):
        """ゲーム状態更新"""
        if self.game_over or self.paused:
            return
        
        # 時間計算
        current_time = time.time()
        if dt is None:
            dt = current_time - self.last_update
        self.last_update = current_time
        self.game_time += dt
        
        # ボール生成チェック
        if current_time - self.last_ball_spawn > self.ball_spawn_interval:
            self._spawn_ball()
            self.last_ball_spawn = current_time
        
        # 各ボールの更新
        balls_to_remove = []
        for ball in self.balls:
            # 物理演算適用
            self.physics.apply_physics(ball, dt)
            ball.update_position(dt)
            
            # 壁との衝突
            collision = self.collision_detector.ball_wall_collision(ball, self.width, self.height)
            if collision == 'horizontal':
                ball.dx *= -1
                ball.x = max(ball.radius, min(self.width - ball.radius, ball.x))
            elif collision == 'top':
                ball.dy = abs(ball.dy)
                ball.y = ball.radius
            elif collision == 'bottom':
                # ゲームオーバー
                self.game_over = True
                self._notify_game_over()
                break
            
            # ラケットとの衝突
            if self.collision_detector.ball_racket_collision(ball, self.racket):
                if ball.dy > 0:  # 下向きの時のみ
                    new_dx, new_dy = self.collision_detector.calculate_bounce_angle(ball, self.racket)
                    ball.dx = new_dx * self.modifiers['speedMultiplier']
                    ball.dy = new_dy * self.modifiers['speedMultiplier']
                    
                    # スコア加算
                    self.score.add_points(10, is_combo=True)
                    self._notify_score_change()
        
        # 不要なボール削除
        for ball in balls_to_remove:
            self.balls.remove(ball)
        
        # ラケット更新
        self.racket.move_to(self.racket.target_x, smooth=True)
        
        # 観察者に通知
        self._notify_observers()
    
    def move_racket(self, x: float):
        """ラケット移動"""
        self.racket.target_x = max(self.racket.size//2, 
                                  min(self.width - self.racket.size//2, x))
    
    def toggle_pause(self):
        """ポーズ切り替え"""
        self.paused = not self.paused
        self._notify_observers()
    
    def reset(self):
        """ゲームリセット"""
        self.balls.clear()
        self.racket = Racket(x=self.width//2, size=80, base_size=80)
        self.score.reset()
        self.game_over = False
        self.paused = False
        self.game_time = 0.0
        self.last_update = time.time()
        self.last_ball_spawn = 0.0
        
        self._spawn_initial_ball()
        self._notify_observers()
        self._notify_score_change()
    
    def set_difficulty(self, level: int):
        """難易度設定"""
        self.difficulty = max(1, min(5, level))
        self.ball_spawn_interval = max(1.0, 6.0 - level)
        self.modifiers['speedMultiplier'] = 1.0 + (level - 1) * 0.2
    
    def apply_modifiers(self, modifiers: Dict[str, Any]):
        """チャレンジ修飾子適用"""
        self.modifiers.update(modifiers)
    
    def get_state(self) -> Dict[str, Any]:
        """現在のゲーム状態取得"""
        return {
            'balls': [ball.to_dict() for ball in self.balls],
            'racket': self.racket.to_dict(),
            'score': self.score.to_dict(),
            'game_over': self.game_over,
            'paused': self.paused,
            'game_time': self.game_time,
            'difficulty': self.difficulty,
            'modifiers': self.modifiers.copy()
        }
    
    def _spawn_initial_ball(self):
        """初期ボール生成"""
        ball = Ball(
            x=self.width // 2,
            y=50,
            dx=random.uniform(-3, 3),
            dy=3,
            size=20,
            color=(255, 0, 0)
        )
        self.balls.append(ball)
    
    def _spawn_ball(self):
        """新規ボール生成"""
        size = int(20 * self.modifiers.get('sizeMultiplier', 1.0))
        ball = Ball(
            x=random.randint(size, self.width - size),
            y=50,
            dx=random.uniform(-4, 4) * self.modifiers['speedMultiplier'],
            dy=random.uniform(2, 4) * self.modifiers['speedMultiplier'],
            size=size,
            color=self._get_random_color()
        )
        self.balls.append(ball)
    
    def _get_random_color(self) -> Tuple[int, int, int]:
        """ランダム色生成"""
        colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
        ]
        return random.choice(colors)