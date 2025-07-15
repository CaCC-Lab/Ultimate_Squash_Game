"""
Pygame-CE対応ゲーム状態管理モデル（Model層）

個人開発規約遵守:
- TDD必須: テストファースト開発
- モック禁止: 純粋なデータクラスのため実環境テスト
- エラー3要素: 状態変更時のエラーハンドリング

技術移行:
- Python 3.6 → 3.12対応
- Tkinter → Pygame-CE対応
- 既存MVCパターンの移植
"""

import math
import copy
from typing import List, Dict, Any, Tuple


class PygameBall:
    """Pygame-CE対応ボールエンティティ"""
    
    def __init__(self, x: float, y: float, dx: float, dy: float, size: int, color: Tuple[int, int, int]):
        self.x = float(x)
        self.y = float(y)
        self.dx = float(dx)  # X方向速度
        self.dy = float(dy)  # Y方向速度
        self.size = int(size)
        self.color = color  # RGB tuple (255, 0, 0)
        
        # Pygame描画用の追加属性
        self.radius = size // 2
        self.rect = None  # pygame.Rectは後で設定
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式への変換（既存コードとの互換性）"""
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
    def from_dict(cls, data: Dict[str, Any]) -> 'PygameBall':
        """辞書形式からの生成"""
        return cls(
            x=data['x'],
            y=data['y'],
            dx=data['dx'],
            dy=data['dy'],
            size=data['size'],
            color=data['color']
        )
    
    def get_pygame_rect(self):
        """Pygame描画用の矩形取得"""
        import pygame
        return pygame.Rect(
            self.x - self.radius,
            self.y - self.radius,
            self.size,
            self.size
        )
    
    def __repr__(self):
        return f"PygameBall(x={self.x}, y={self.y}, dx={self.dx}, dy={self.dy}, size={self.size}, color={self.color})"


class PygameRacket:
    """Pygame-CE対応ラケットエンティティ"""
    
    RACKET_Y = 470  # ラケットのY座標（固定）
    
    def __init__(self, x: float, size: int, base_size: int):
        self.x = float(x)
        self.y = float(self.RACKET_Y)
        self.size = int(size)
        self.base_size = int(base_size)
        self.color = (255, 255, 0)  # Yellow RGB
        
        # Pygame描画用の追加属性
        self.height = 10
        self.rect = None  # pygame.Rectは後で設定
    
    @property
    def left_edge(self) -> float:
        """ラケットの左端座標"""
        return self.x
    
    @property  
    def right_edge(self) -> float:
        """ラケットの右端座標"""
        return self.x + self.size
    
    def get_pygame_rect(self):
        """Pygame描画用の矩形取得"""
        import pygame
        return pygame.Rect(self.x, self.y, self.size, self.height)
    
    def __repr__(self):
        return f"PygameRacket(x={self.x}, y={self.y}, size={self.size})"


class PygameScore:
    """Pygame-CE対応スコアエンティティ"""
    
    def __init__(self, point: int = 0, level: int = 1, combo: int = 0):
        self.point = int(point)
        self.level = int(level)
        self.combo = int(combo)
    
    def calculate_hit_score(self) -> int:
        """ヒット時のスコア計算（コンボボーナス含む）"""
        bonus = math.floor(self.combo / 5)
        return 10 * (1 + bonus)
    
    def __repr__(self):
        return f"PygameScore(point={self.point}, level={self.level}, combo={self.combo})"


class PygameGameStateObserver:
    """Pygame-CE対応 Observer パターンインターフェース"""
    
    def on_game_state_changed(self, game_state: 'PygameGameState'):
        """ゲーム状態変更時の通知"""
        raise NotImplementedError("Subclasses must implement on_game_state_changed")


class PygameGameState:
    """
    Pygame-CE対応ゲーム状態管理Model
    
    既存MVCパターンからの移植:
    - Model層の責務：ゲーム状態管理、物理演算、ビジネスロジック
    - Observer パターン：Model → View通知
    - 純粋データクラス：UI描画に依存しない
    """
    
    # 画面サイズ定数
    SCREEN_WIDTH = 640
    SCREEN_HEIGHT = 480
    
    def __init__(self):
        # ゲーム状態
        self.is_gameover = False
        self.paused = False
        self.speed = 50  # ゲームループ速度（ms）
        
        # ゲームエンティティ
        self.balls: List[PygameBall] = []
        self.racket: PygameRacket = None
        self.score: PygameScore = PygameScore()
        
        # Observer パターン
        self._observers: List[PygameGameStateObserver] = []
        
        # 初期化
        self._initialize_game_objects()
    
    def _initialize_game_objects(self):
        """ゲームオブジェクトの初期化"""
        # 初期ボール作成（RGB color）
        initial_ball = PygameBall(
            x=320.0, y=250.0,
            dx=15.0, dy=-15.0,
            size=10,
            color=(255, 0, 0)  # Red
        )
        self.balls = [initial_ball]
        
        # 初期ラケット作成
        self.racket = PygameRacket(x=270.0, size=100, base_size=100)
        
        # 初期スコア
        self.score = PygameScore()
    
    def add_observer(self, observer: PygameGameStateObserver):
        """Observerの追加"""
        if observer not in self._observers:
            self._observers.append(observer)
    
    def remove_observer(self, observer: PygameGameStateObserver):
        """Observerの削除"""
        if observer in self._observers:
            self._observers.remove(observer)
    
    def _notify_observers(self):
        """全Observerに状態変更を通知"""
        for observer in self._observers:
            try:
                observer.on_game_state_changed(self)
            except Exception as e:
                # Observer通知エラーのエラー3要素ハンドリング
                print(f"Observer通知エラー: {str(e)} - Observer実装に問題があります - 該当Observerを確認してください")
    
    def update_ball_position(self, ball: PygameBall) -> bool:
        """
        ボール位置更新とすべての衝突判定
        
        Returns:
            bool: 衝突が発生した場合True
        """
        collision_occurred = False
        
        # 壁衝突チェック
        if self._check_wall_collision(ball):
            collision_occurred = True
        
        # ラケット/ミス衝突チェック
        if self._check_racket_collision(ball):
            collision_occurred = True
        
        # 位置更新（衝突後の速度反映）
        ball.x += ball.dx
        ball.y += ball.dy
        
        return collision_occurred
    
    def _check_wall_collision(self, ball: PygameBall) -> bool:
        """壁衝突の判定と処理"""
        collision = False
        
        # 左右の壁
        future_x = ball.x + ball.dx
        if future_x < 0 or future_x > self.SCREEN_WIDTH:
            ball.dx *= -1
            collision = True
        
        # 上の壁
        future_y = ball.y + ball.dy
        if future_y < 0:
            ball.dy *= -1
            collision = True
        
        return collision
    
    def _check_racket_collision(self, ball: PygameBall) -> bool:
        """ラケット衝突とミスの判定"""
        future_y = ball.y + ball.dy
        future_x = ball.x + ball.dx
        
        # ラケット衝突判定（改良版）
        if future_y >= self.racket.y:
            if self.racket.left_edge <= future_x <= self.racket.right_edge:
                # ラケットヒット
                ball.dy *= -1
                self._handle_successful_hit()
                return True
            else:
                # ミス
                self._handle_miss(ball)
                return True
        
        return False
    
    def _handle_successful_hit(self):
        """成功ヒット処理"""
        self.score.combo += 1
        self.score.point += self.score.calculate_hit_score()
        self._notify_observers()
    
    def _handle_miss(self, ball: PygameBall):
        """ミス処理"""
        if ball in self.balls:
            self.balls.remove(ball)
        
        self.score.combo = 0
        
        if len(self.balls) == 0:
            self.is_gameover = True
        
        self._notify_observers()
    
    def update_racket_position(self, x: float):
        """ラケット位置更新（境界制限付き）"""
        # 左端制限
        if x < 0:
            x = 0
        # 右端制限
        elif x + self.racket.size > self.SCREEN_WIDTH:
            x = self.SCREEN_WIDTH - self.racket.size
        
        self.racket.x = x
        self._notify_observers()
    
    def toggle_pause(self):
        """ポーズ状態切り替え"""
        self.paused = not self.paused
        self._notify_observers()
    
    def reset_game(self):
        """ゲームリセット"""
        self.is_gameover = False
        self.paused = False
        self._initialize_game_objects()
        self._notify_observers()
    
    # ADA機能基盤メソッド（Phase 2Aから移植）
    def get_ball_speed(self, ball: PygameBall) -> float:
        """ボール速度の大きさ計算（ADA機能用）"""
        return math.sqrt(ball.dx**2 + ball.dy**2)
    
    def get_ball_angle(self, ball: PygameBall) -> float:
        """ボール角度計算（度）（ADA機能用）"""
        angle_rad = math.atan2(ball.dy, ball.dx)
        return math.degrees(angle_rad)
    
    def get_state_snapshot(self) -> Dict[str, Any]:
        """ゲーム状態のスナップショット取得（テスト用）"""
        return {
            'is_gameover': self.is_gameover,
            'paused': self.paused,
            'speed': self.speed,
            'balls': [ball.to_dict() for ball in self.balls],
            'racket': {
                'x': self.racket.x,
                'size': self.racket.size,
                'base_size': self.racket.base_size
            },
            'score': {
                'point': self.score.point,
                'level': self.score.level,
                'combo': self.score.combo
            }
        }