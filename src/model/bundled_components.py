"""
モジュール化されたゲームコンポーネント
bundled_game.pyから抽出・整理
"""

from typing import Dict, Any, Tuple, List, Optional, Callable
from dataclasses import dataclass
import math


class Ball:
    """ゲームボール基本クラス"""
    
    def __init__(self, x: float, y: float, dx: float, dy: float, size: int, color: Tuple[int, int, int]):
        self.x = float(x)
        self.y = float(y)
        self.dx = float(dx)  # X方向速度
        self.dy = float(dy)  # Y方向速度
        self.size = int(size)
        self.color = color  # RGB tuple
        self.radius = size // 2
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式への変換"""
        return {
            'x': self.x,
            'y': self.y,
            'dx': self.dx,
            'dy': self.dy,
            'size': self.size,
            'color': self.color,
            'radius': self.radius
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Ball':
        """辞書形式からの生成"""
        return cls(
            x=data['x'],
            y=data['y'],
            dx=data['dx'],
            dy=data['dy'],
            size=data['size'],
            color=data['color']
        )
    
    def update_position(self, dt: float = 1.0):
        """位置更新"""
        self.x += self.dx * dt
        self.y += self.dy * dt
    
    def __repr__(self):
        return f"Ball(x={self.x:.1f}, y={self.y:.1f}, dx={self.dx:.1f}, dy={self.dy:.1f})"


class Racket:
    """ゲームラケット基本クラス"""
    
    RACKET_Y = 470  # ラケットのY座標（固定）
    
    def __init__(self, x: float, size: int, base_size: int):
        self.x = float(x)
        self.y = float(self.RACKET_Y)
        self.size = int(size)
        self.base_size = int(base_size)
        self.target_x = x
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式への変換"""
        return {
            'x': self.x,
            'y': self.y,
            'size': self.size,
            'base_size': self.base_size
        }
    
    def move_to(self, target_x: float, smooth: bool = True):
        """ラケット移動"""
        self.target_x = target_x
        if smooth:
            # スムーズ移動
            self.x += (self.target_x - self.x) * 0.2
        else:
            # 即座に移動
            self.x = self.target_x
    
    def get_bounds(self) -> Tuple[float, float]:
        """ラケットの左右境界を取得"""
        half_size = self.size / 2
        return (self.x - half_size, self.x + half_size)
    
    def __repr__(self):
        return f"Racket(x={self.x:.1f}, size={self.size})"


@dataclass
class Score:
    """スコア管理クラス"""
    value: int = 0
    combo: int = 0
    max_combo: int = 0
    
    def reset(self):
        """スコアリセット"""
        self.value = 0
        self.combo = 0
        self.max_combo = 0
    
    def add_points(self, points: int, is_combo: bool = False):
        """ポイント追加"""
        if is_combo:
            self.combo += 1
            self.max_combo = max(self.max_combo, self.combo)
            # コンボボーナス
            bonus = min(self.combo // 5, 5) * 10
            self.value += points + bonus
        else:
            self.combo = 0
            self.value += points
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式への変換"""
        return {
            'value': self.value,
            'combo': self.combo,
            'max_combo': self.max_combo
        }


class CollisionDetector:
    """衝突検出ユーティリティ"""
    
    @staticmethod
    def ball_wall_collision(ball: Ball, width: int, height: int) -> Optional[str]:
        """壁との衝突検出"""
        # 左右の壁
        if ball.x - ball.radius <= 0 or ball.x + ball.radius >= width:
            return 'horizontal'
        # 上の壁
        if ball.y - ball.radius <= 0:
            return 'top'
        # 下の壁（ゲームオーバー）
        if ball.y + ball.radius >= height:
            return 'bottom'
        return None
    
    @staticmethod
    def ball_racket_collision(ball: Ball, racket: Racket) -> bool:
        """ラケットとの衝突検出"""
        # Y軸の範囲チェック
        if ball.y + ball.radius < racket.y - 5:
            return False
        if ball.y - ball.radius > racket.y + 20:
            return False
        
        # X軸の範囲チェック
        left_bound, right_bound = racket.get_bounds()
        if ball.x + ball.radius < left_bound:
            return False
        if ball.x - ball.radius > right_bound:
            return False
        
        return True
    
    @staticmethod
    def calculate_bounce_angle(ball: Ball, racket: Racket) -> Tuple[float, float]:
        """ラケットでの反射角度計算"""
        # ラケット中心からの相対位置
        relative_x = ball.x - racket.x
        normalized_x = relative_x / (racket.size / 2)
        
        # -1 ~ 1 の範囲にクリップ
        normalized_x = max(-1, min(1, normalized_x))
        
        # 反射角度（最大45度）
        angle = normalized_x * math.pi / 4
        
        # 速度ベクトル計算
        speed = math.sqrt(ball.dx ** 2 + ball.dy ** 2)
        new_dx = speed * math.sin(angle)
        new_dy = -abs(speed * math.cos(angle))  # 必ず上向き
        
        return new_dx, new_dy


class GamePhysics:
    """ゲーム物理演算"""
    
    def __init__(self, gravity: float = 0.2, friction: float = 0.99):
        self.gravity = gravity
        self.friction = friction
        self.max_speed = 15.0
        self.min_speed = 3.0
    
    def apply_physics(self, ball: Ball, dt: float = 1.0):
        """物理演算適用"""
        # 重力
        ball.dy += self.gravity * dt
        
        # 摩擦
        ball.dx *= self.friction
        ball.dy *= self.friction
        
        # 速度制限
        speed = math.sqrt(ball.dx ** 2 + ball.dy ** 2)
        if speed > self.max_speed:
            factor = self.max_speed / speed
            ball.dx *= factor
            ball.dy *= factor
        elif speed < self.min_speed and speed > 0:
            factor = self.min_speed / speed
            ball.dx *= factor
            ball.dy *= factor