"""
AI強化ゲームステート（AI統合Model層）

個人開発規約遵守:
- TDD必須: ゲームイベント通知のテスト
- モック禁止: 実際のゲーム状態でテスト
- エラー3要素: イベント処理エラーのハンドリング

技術移行:
- イベント駆動アーキテクチャの拡張
- 衝突イベントのコールバック機能
- ADA統合のためのフック
"""

from typing import Optional, Callable, Dict, Any
from src.model.pygame_game_state import PygameGameState, PygameBall


class AIEnhancedGameState(PygameGameState):
    """
    AI機能を統合した強化版ゲームステート
    
    責務:
    - ゲームイベントの通知機能
    - 衝突検出時のコールバック
    - ADAシステムとの連携
    """
    
    def __init__(self, screen_width: int = 640, screen_height: int = 480):
        """
        AI強化ゲームステートの初期化
        
        Args:
            screen_width: int - 画面幅
            screen_height: int - 画面高さ
        """
        super().__init__(screen_width, screen_height)
        
        # イベントコールバック
        self.event_callbacks: Dict[str, Callable[[str, Dict[str, Any]], None]] = {}
        
        # イベント統計
        self.event_stats = {
            'paddle_hits': 0,
            'wall_hits': 0,
            'misses': 0,
            'total_hits': 0
        }
    
    def register_event_callback(self, event_type: str, callback: Callable[[str, Dict[str, Any]], None]):
        """
        イベントコールバックを登録
        
        Args:
            event_type: str - イベントタイプ（'collision'等）
            callback: Callable - コールバック関数
        """
        self.event_callbacks[event_type] = callback
    
    def _trigger_event(self, event_type: str, event_name: str, event_data: Dict[str, Any]):
        """
        イベントをトリガー
        
        Args:
            event_type: str - イベントタイプ
            event_name: str - イベント名
            event_data: Dict - イベントデータ
        """
        if event_type in self.event_callbacks:
            try:
                self.event_callbacks[event_type](event_name, event_data)
            except Exception as e:
                print(f"イベントコールバックエラー: {str(e)}")
    
    def update_ball_position(self, ball: PygameBall) -> bool:
        """
        ボール位置更新（イベント通知付き）
        
        Args:
            ball: PygameBall - 更新するボール
            
        Returns:
            bool: 衝突が発生したかどうか
        """
        # 元の位置を保存
        old_x, old_y = ball.x, ball.y
        old_dx, old_dy = ball.dx, ball.dy
        
        # 新しい位置を計算
        new_x = ball.x + ball.dx
        new_y = ball.y + ball.dy
        
        collision_occurred = False
        
        # 上壁との衝突判定
        if new_y - ball.radius <= 0:
            new_y = ball.radius
            ball.dy = abs(ball.dy)
            collision_occurred = True
            self.event_stats['wall_hits'] += 1
            self._trigger_event('collision', 'wall_hit', {
                'wall': 'top',
                'position': (new_x, new_y),
                'velocity': (ball.dx, ball.dy),
                'ball_speed': (ball.dx**2 + ball.dy**2)**0.5
            })
        
        # 左右壁との衝突判定
        if new_x - ball.radius <= 0:
            new_x = ball.radius
            ball.dx = abs(ball.dx)
            collision_occurred = True
            self.event_stats['wall_hits'] += 1
            self._trigger_event('collision', 'wall_hit', {
                'wall': 'left',
                'position': (new_x, new_y),
                'velocity': (ball.dx, ball.dy),
                'ball_speed': (ball.dx**2 + ball.dy**2)**0.5
            })
        elif new_x + ball.radius >= self.width:
            new_x = self.width - ball.radius
            ball.dx = -abs(ball.dx)
            collision_occurred = True
            self.event_stats['wall_hits'] += 1
            self._trigger_event('collision', 'wall_hit', {
                'wall': 'right',
                'position': (new_x, new_y),
                'velocity': (ball.dx, ball.dy),
                'ball_speed': (ball.dx**2 + ball.dy**2)**0.5
            })
        
        # ラケットとの衝突判定（下側）
        if new_y + ball.radius >= self.racket.y - self.racket.height // 2:
            # ラケット範囲内かチェック
            if (new_x >= self.racket.x - self.racket.width // 2 and 
                new_x <= self.racket.x + self.racket.width // 2):
                
                # ラケットの上面でバウンド
                new_y = self.racket.y - self.racket.height // 2 - ball.radius
                
                # 打ち返し角度を計算（ラケット位置による）
                hit_position = (new_x - self.racket.x) / (self.racket.width / 2)
                hit_position = max(-1.0, min(1.0, hit_position))
                
                # 横方向の速度を調整
                ball.dx = ball.dx + hit_position * 3.0
                ball.dy = -abs(ball.dy)
                
                # スコア加算とコンボ処理
                self.score.add_point(hit_position)
                collision_occurred = True
                self.event_stats['paddle_hits'] += 1
                self.event_stats['total_hits'] += 1
                
                # パドルヒットイベント
                self._trigger_event('collision', 'paddle_hit', {
                    'position': (new_x, new_y),
                    'hit_position': hit_position,
                    'velocity': (ball.dx, ball.dy),
                    'score': self.score.point,
                    'combo': self.score.combo,
                    'ball_speed': (ball.dx**2 + ball.dy**2)**0.5
                })
                
                # Observers通知
                self.notify_observers()
                
            else:
                # ミス判定（画面下部に到達）
                if new_y - ball.radius >= self.height:
                    self.balls.remove(ball)
                    self.score.reset_combo()
                    self.event_stats['misses'] += 1
                    
                    # ミスイベント
                    self._trigger_event('collision', 'miss', {
                        'position': (new_x, new_y),
                        'velocity': (ball.dx, ball.dy),
                        'score': self.score.point,
                        'total_misses': self.event_stats['misses']
                    })
                    
                    # ゲームオーバー判定
                    if len(self.balls) == 0:
                        self.is_gameover = True
                        self._trigger_event('game', 'game_over', {
                            'final_score': self.score.point,
                            'total_hits': self.event_stats['total_hits'],
                            'total_misses': self.event_stats['misses'],
                            'hit_rate': self.event_stats['total_hits'] / max(1, self.event_stats['total_hits'] + self.event_stats['misses'])
                        })
                    
                    # Observers通知
                    self.notify_observers()
                    return True
        
        # 位置を更新
        ball.x = new_x
        ball.y = new_y
        
        return collision_occurred
    
    def reset_game(self):
        """ゲームリセット（イベント通知付き）"""
        # イベント統計をリセット
        self.event_stats = {
            'paddle_hits': 0,
            'wall_hits': 0,
            'misses': 0,
            'total_hits': 0
        }
        
        # 親クラスのリセット
        super().reset_game()
        
        # リセットイベント
        self._trigger_event('game', 'reset', {
            'screen_size': (self.width, self.height),
            'ball_count': len(self.balls)
        })
    
    def toggle_pause(self):
        """ポーズ切り替え（イベント通知付き）"""
        super().toggle_pause()
        
        # ポーズイベント
        self._trigger_event('game', 'pause_toggle', {
            'paused': self.paused,
            'score': self.score.point
        })
    
    def get_game_metrics(self) -> Dict[str, Any]:
        """
        ゲームメトリクスを取得
        
        Returns:
            Dict: ゲームの統計情報
        """
        total_attempts = self.event_stats['total_hits'] + self.event_stats['misses']
        hit_rate = self.event_stats['total_hits'] / max(1, total_attempts)
        miss_rate = 1.0 - hit_rate
        
        return {
            'score': self.score.point,
            'combo': self.score.combo,
            'balls_active': len(self.balls),
            'paddle_hits': self.event_stats['paddle_hits'],
            'wall_hits': self.event_stats['wall_hits'],
            'misses': self.event_stats['misses'],
            'total_hits': self.event_stats['total_hits'],
            'hit_rate': hit_rate,
            'miss_rate': miss_rate,
            'is_gameover': self.is_gameover,
            'is_paused': self.paused
        }