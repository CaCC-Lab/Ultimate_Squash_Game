"""
ゲーム状態管理モデル（Model層）

個人開発規約遵守:
- TDD必須: テストファースト開発
- モック禁止: 純粋なデータクラスのため実環境テスト
- エラー3要素: 状態変更時のエラーハンドリング
"""

import math
import copy


class Ball:
    """ボールエンティティ（Python 3.6対応）"""
    
    def __init__(self, x, y, dx, dy, size, color):
        self.x = float(x)
        self.y = float(y)
        self.dx = float(dx)  # X方向速度
        self.dy = float(dy)  # Y方向速度
        self.size = int(size)
        self.color = str(color)
    
    def to_dict(self):
        """辞書形式への変換（既存コードとの互換性）"""
        return {
            'x': self.x,
            'y': self.y,
            'dx': self.dx,
            'dy': self.dy,
            'size': self.size,
            'color': self.color
        }
    
    @classmethod
    def from_dict(cls, data):
        """辞書形式からの生成"""
        return cls(
            x=data['x'],
            y=data['y'],
            dx=data['dx'],
            dy=data['dy'],
            size=data['size'],
            color=data['color']
        )
    
    def __repr__(self):
        return f"Ball(x={self.x}, y={self.y}, dx={self.dx}, dy={self.dy}, size={self.size}, color='{self.color}')"


class Racket:
    """ラケットエンティティ（Python 3.6対応）"""
    
    def __init__(self, x, size, base_size, y=470):
        self.x = float(x)
        self.size = int(size)
        self.base_size = int(base_size)
        self.y = float(y)  # ラケットのY座標（固定）
    
    @property
    def left_edge(self):
        """ラケットの左端"""
        return self.x
    
    @property
    def right_edge(self):
        """ラケットの右端"""
        return self.x + self.size
    
    def __repr__(self):
        return f"Racket(x={self.x}, size={self.size}, base_size={self.base_size}, y={self.y})"


class Score:
    """スコアエンティティ（Python 3.6対応）"""
    
    def __init__(self, point=0, level=1, combo=0):
        self.point = int(point)
        self.level = int(level)
        self.combo = int(combo)
    
    def calculate_hit_score(self):
        """ヒット時のスコア計算"""
        bonus = math.floor(self.combo / 5)
        return 10 * (1 + bonus)
    
    def __repr__(self):
        return f"Score(point={self.point}, level={self.level}, combo={self.combo})"


class GameState:
    """
    ゲーム状態管理クラス（Observable Model）
    UIに依存しない純粋なゲーム状態とロジックを管理
    Observerパターンで状態変更をViewに通知
    """
    
    # ゲーム画面サイズ定数
    SCREEN_WIDTH = 640
    SCREEN_HEIGHT = 480
    RACKET_Y = 470
    
    def __init__(self):
        """ゲーム状態の初期化"""
        self.is_gameover = False
        self.paused = False
        self.speed = 50
        
        # Observerパターン用
        self._observers = []
        
        # エンティティの初期化
        self.balls = []
        self.racket = None
        self.score = Score()
        
        # 初期状態の設定
        self._initialize_game_objects()
    
    def add_observer(self, observer):
        """
        Observerの追加
        
        Args:
            observer: GameObserver - 状態変更を通知するObserver
        """
        if observer not in self._observers:
            self._observers.append(observer)
    
    def remove_observer(self, observer):
        """
        Observerの削除
        
        Args:
            observer: GameObserver - 削除するObserver
        """
        if observer in self._observers:
            self._observers.remove(observer)
    
    def _notify_observers(self):
        """全Observerに状態変更を通知"""
        for observer in self._observers:
            try:
                observer.on_game_state_changed(self)
            except Exception as e:
                print(f"Observer通知エラー: {str(e)} - Observerを無効化します")
                self.remove_observer(observer)
    
    def _initialize_game_objects(self):
        """ゲームオブジェクトの初期化"""
        # 初期ボール
        initial_ball = Ball(
            x=320.0,
            y=250.0,
            dx=15.0,
            dy=-15.0,
            size=10,
            color='red'
        )
        self.balls = [initial_ball]
        
        # 初期ラケット
        self.racket = Racket(
            x=270.0,
            size=100,
            base_size=100,
            y=self.RACKET_Y
        )
        
        # 初期スコア
        self.score = Score()
    
    def update_ball_position(self, ball):
        """
        ボール位置の更新
        
        Returns:
            bool: 衝突が発生した場合True
        """
        if self.is_gameover or self.paused:
            return False
        
        # 壁との衝突チェック
        if self._check_wall_collision(ball):
            return True
        
        # ラケットとの衝突チェック
        if self._check_racket_collision(ball):
            return True
        
        # 位置の更新
        if 0 <= ball.x + ball.dx <= self.SCREEN_WIDTH:
            ball.x += ball.dx
        if 0 <= ball.y + ball.dy <= self.SCREEN_HEIGHT:
            ball.y += ball.dy
        
        return False
    
    def _check_wall_collision(self, ball):
        """壁との衝突チェック"""
        collision = False
        
        # 左右の壁
        if ball.x + ball.dx < 0 or ball.x + ball.dx > self.SCREEN_WIDTH:
            ball.dx *= -1
            collision = True
        
        # 上の壁
        if ball.y + ball.dy < 0:
            ball.dy *= -1
            collision = True
        
        return collision
    
    def _check_racket_collision(self, ball):
        """ラケットとの衝突チェック"""
        if not self.racket:
            return False
        
        future_y = ball.y + ball.dy
        future_x = ball.x + ball.dx
        
        # ラケット上面での衝突
        if future_y > self.RACKET_Y and (
            self.racket.left_edge <= future_x <= self.racket.right_edge
        ):
            ball.dy *= -1
            self._handle_successful_hit()
            return True
        
        # 画面下端での落下（ミス）
        elif future_y >= self.SCREEN_HEIGHT:
            self._handle_miss(ball)
            return True
        
        return False
    
    def _handle_successful_hit(self):
        """成功ヒット処理"""
        self.score.combo += 1
        hit_score = self.score.calculate_hit_score()
        self.score.point += hit_score
        self._notify_observers()  # スコア変更をObserverに通知
    
    def _handle_miss(self, ball):
        """ミス処理"""
        # ボールを削除
        if ball in self.balls:
            self.balls.remove(ball)
        
        # コンボリセット
        self.score.combo = 0
        
        # ゲームオーバー判定
        if len(self.balls) == 0:
            self.is_gameover = True
        
        self._notify_observers()  # ゲーム状態変更をObserverに通知
    
    def update_racket_position(self, x):
        """ラケット位置の更新"""
        if self.racket and not self.is_gameover and not self.paused:
            # 画面内に制限
            self.racket.x = max(0, min(self.SCREEN_WIDTH - self.racket.size, x))
    
    def toggle_pause(self):
        """ポーズ状態の切り替え"""
        self.paused = not self.paused
        self._notify_observers()  # ポーズ状態変更をObserverに通知
    
    def reset_game(self):
        """ゲームのリセット"""
        self.is_gameover = False
        self.paused = False
        self._initialize_game_objects()
        self._notify_observers()  # ゲームリセットをObserverに通知
    
    def get_state_snapshot(self):
        """現在の状態のスナップショット取得（デバッグ用）"""
        return {
            'is_gameover': self.is_gameover,
            'paused': self.paused,
            'speed': self.speed,
            'balls': [ball.to_dict() for ball in self.balls],
            'racket': {
                'x': self.racket.x if self.racket else 0,
                'size': self.racket.size if self.racket else 0,
                'base_size': self.racket.base_size if self.racket else 0
            } if self.racket else None,
            'score': {
                'point': self.score.point,
                'level': self.score.level,
                'combo': self.score.combo
            }
        }
    
    def update_frame(self):
        """フレーム更新（全ボールの位置更新）"""
        if self.is_gameover or self.paused:
            return
        
        # 全ボールの位置を更新
        for ball in self.balls[:]:  # コピーしてイテレート（削除安全）
            self.update_ball_position(ball)
        
        self._notify_observers()  # フレーム更新をObserverに通知