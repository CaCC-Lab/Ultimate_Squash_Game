"""
Ultimate Squash Game - Pyodide最適化バンドル
自動生成: python_bundler.py により生成
"""

# === 最適化インポート ===
import json
import math
import time
import typing
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass

# === Pyodide統合 ===
try:
    import js
    PYODIDE_MODE = True
except ImportError:
    class MockJs:
        def __init__(self): pass
    js = MockJs()
    PYODIDE_MODE = False

# === model.pygame_game_state モジュール ===
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



class PygameBall:
    
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
        return pygame.Rect(
            self.x - self.radius,
            self.y - self.radius,
            self.size,
            self.size
        )
    
    def __repr__(self):
        return f"PygameBall(x={self.x}, y={self.y}, dx={self.dx}, dy={self.dy}, size={self.size}, color={self.color})"


class PygameRacket:
    
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
        return pygame.Rect(self.x, self.y, self.size, self.height)
    
    def __repr__(self):
        return f"PygameRacket(x={self.x}, y={self.y}, size={self.size})"


class PygameScore:
    
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

# === view.web_game_view モジュール ===
"""
Web環境対応ゲーム表示View（Canvas API統合）

個人開発規約遵守:
- TDD必須: Web環境描画ロジックのテスト
- モック禁止: 実際のCanvas API連携確認
- エラー3要素: Web描画エラー時の適切なメッセージ

技術移行:
- Pygame-CE → Canvas API移植
- WASM/Pyodide環境対応
- JavaScript連携強化
"""



class WebCanvasView(PygameGameStateObserver):
    """
    Web環境対応ゲーム描画View（Canvas API統合）
    
    Pygame-CEの代替として、HTML5 Canvas APIとの連携を提供
    JavaScript側での実際の描画処理と連携
    """
    
    def __init__(self, canvas_id: str = "gameCanvas", width: int = 640, height: int = 480):
        """
        Web Canvas Viewの初期化
        
        Args:
            canvas_id: str - HTML Canvas要素のID
            width: int - キャンバス幅
            height: int - キャンバス高さ
        """
        self.canvas_id = canvas_id
        self.width = width
        self.height = height
        
        # 描画状態管理
        self.current_frame_data = {}
        self.frame_count = 0
        
        # JavaScript連携用の描画コマンドキュー
        self.draw_commands = []
        
        # エラー処理
        self.last_error = None
        
        print(f"WebCanvasView初期化完了: {canvas_id} ({width}x{height})")
    
    def on_game_state_changed(self, game_state: PygameGameState):
        """
        ゲーム状態変更通知（Observerパターン）
        
        Args:
            game_state: PygameGameState - 変更されたゲーム状態
        """
        try:
            # ゲーム状態をCanvas描画用データに変換
            frame_data = self._convert_game_state_to_canvas_data(game_state)
            
            # 描画コマンド生成
            draw_commands = self._generate_draw_commands(frame_data)
            
            # JavaScript側に送信用データ準備
            self.current_frame_data = frame_data
            self.draw_commands = draw_commands
            self.frame_count += 1
            
            # ブラウザ環境では実際のCanvas描画はJavaScript側で実行
            # ここではデータ準備のみ行う
            
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "Web Canvas描画データ準備に失敗しました",
                'why': f"ゲーム状態変換処理でエラーが発生: {str(e)}",
                'how': "ブラウザのJavaScriptコンソールを確認し、Canvas APIの対応状況を確認してください"
            }
            print(f"Canvas描画エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            self.last_error = error_msg
    
    def _convert_game_state_to_canvas_data(self, game_state: PygameGameState) -> Dict[str, Any]:
        """
        PygameGameStateをCanvas描画用データに変換
        
        Args:
            game_state: PygameGameState - 変換対象のゲーム状態
            
        Returns:
            Dict[str, Any]: Canvas描画用データ
        """
        # ボールデータ変換
        balls_data = []
        for ball in game_state.balls:
            ball_data = {
                'x': float(ball.x),
                'y': float(ball.y),
                'radius': float(ball.radius),
                'color': self._rgb_to_css_color(ball.color),
                'dx': float(ball.dx),
                'dy': float(ball.dy)
            }
            balls_data.append(ball_data)
        
        # ラケットデータ変換
        racket_data = None
        if game_state.racket:
            racket_data = {
                'x': float(game_state.racket.x),
                'y': float(game_state.racket.y),
                'width': float(game_state.racket.size),
                'height': float(game_state.racket.height),
                'color': self._rgb_to_css_color(game_state.racket.color)
            }
        
        # スコアデータ変換
        score_data = {
            'point': int(game_state.score.point),
            'combo': int(game_state.score.combo),
            'level': int(game_state.score.level)
        }
        
        # ゲーム状態データ
        game_data = {
            'is_gameover': bool(game_state.is_gameover),
            'paused': bool(game_state.paused),
            'frame_count': self.frame_count
        }
        
        return {
            'canvas_id': self.canvas_id,
            'width': self.width,
            'height': self.height,
            'balls': balls_data,
            'racket': racket_data,
            'score': score_data,
            'game_state': game_data,
            'timestamp': self.frame_count  # フレームタイムスタンプ
        }
    
    def _rgb_to_css_color(self, rgb_tuple) -> str:
        """
        RGB tupleをCSS color文字列に変換
        
        Args:
            rgb_tuple: Tuple[int, int, int] - RGB値
            
        Returns:
            str: CSS color文字列 (例: "rgb(255, 0, 0)")
        """
        if isinstance(rgb_tuple, tuple) and len(rgb_tuple) == 3:
            r, g, b = rgb_tuple
            return f"rgb({int(r)}, {int(g)}, {int(b)})"
        else:
            # フォールバック
            return "rgb(255, 0, 0)"  # デフォルト赤色
    
    def _generate_draw_commands(self, frame_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Canvas描画コマンド生成
        
        Args:
            frame_data: Dict[str, Any] - フレームデータ
            
        Returns:
            List[Dict[str, Any]]: 描画コマンドリスト
        """
        commands = []
        
        # 1. 画面クリア
        commands.append({
            'command': 'clear',
            'color': 'rgb(240, 240, 240)'  # ライトグレー背景
        })
        
        # 2. ボール描画
        for ball in frame_data['balls']:
            commands.append({
                'command': 'draw_circle',
                'x': ball['x'],
                'y': ball['y'],
                'radius': ball['radius'],
                'color': ball['color']
            })
        
        # 3. ラケット描画
        if frame_data['racket']:
            racket = frame_data['racket']
            commands.append({
                'command': 'draw_rectangle',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': racket['color']
            })
        
        # 4. スコア描画
        score = frame_data['score']
        commands.append({
            'command': 'draw_text',
            'text': f"Score: {score['point']}",
            'x': 10,
            'y': 30,
            'font': '24px Arial',
            'color': 'rgb(0, 0, 0)'
        })
        
        commands.append({
            'command': 'draw_text',
            'text': f"Combo: {score['combo']}",
            'x': 10,
            'y': 60,
            'font': '24px Arial',
            'color': 'rgb(0, 0, 0)'
        })
        
        # 5. ゲーム状態表示
        game_state = frame_data['game_state']
        if game_state['paused']:
            commands.append({
                'command': 'draw_text',
                'text': 'PAUSED',
                'x': frame_data['width'] // 2 - 50,
                'y': frame_data['height'] // 2,
                'font': '48px Arial',
                'color': 'rgb(255, 0, 0)'
            })
        elif game_state['is_gameover']:
            commands.append({
                'command': 'draw_text',
                'text': 'GAME OVER',
                'x': frame_data['width'] // 2 - 80,
                'y': frame_data['height'] // 2,
                'font': '48px Arial',
                'color': 'rgb(255, 0, 0)'
            })
        
        return commands
    
    def get_javascript_interface_data(self) -> str:
        """
        JavaScript連携用データをJSON形式で取得
        
        Returns:
            str: JSON形式の描画データ
        """
        interface_data = {
            'frame_data': self.current_frame_data,
            'draw_commands': self.draw_commands,
            'canvas_id': self.canvas_id,
            'frame_count': self.frame_count,
            'error': self.last_error
        }
        
        try:
            return json.dumps(interface_data, ensure_ascii=False, indent=2)
        except Exception as e:
            # JSON変換エラー時のフォールバック
            fallback_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"JSON変換でエラーが発生: {str(e)}",
                    'how': "データ形式を確認し、JavaScript側のエラーハンドリングを実装してください"
                }
            }
            return json.dumps(fallback_data, ensure_ascii=False)
    
    def update_window_title(self, title: str):
        """
        ウィンドウタイトルの更新（Web環境用）
        
        Args:
            title: str - 新しいタイトル
        """
        # Web環境ではdocument.titleの更新をJavaScript側で実行
        # ここではタイトル更新コマンドを追加
        self.draw_commands.append({
            'command': 'update_title',
            'title': title
        })
    
    def get_canvas_size(self) -> tuple:
        """Canvas サイズの取得"""
        return (self.width, self.height)
    
    def reset_frame_data(self):
        """フレームデータのリセット"""
        self.current_frame_data = {}
        self.draw_commands = []
        self.last_error = None
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """パフォーマンス統計取得"""
        return {
            'total_frames': self.frame_count,
            'last_frame_commands': len(self.draw_commands),
            'canvas_size': (self.width, self.height),
            'error_count': 1 if self.last_error else 0
        }


class WebSoundView:
    """
    Web環境対応サウンドView（Web Audio API統合）
    """
    
    def __init__(self, sound_enabled: bool = True):
        self.sound_enabled = sound_enabled
        self.audio_context_ready = False
        
        # サウンドコマンドキュー
        self.sound_commands = []
        
        if sound_enabled:
            print("WebSoundView初期化 - Web Audio API準備")
        else:
            print("WebSoundView初期化 - サウンド無効")
    
    def play_sound(self, sound_type: str):
        """
        サウンド再生（Web Audio API連携）
        
        Args:
            sound_type: str - サウンドタイプ（'wall', 'hit', 'miss'）
        """
        # Web Audio APIコマンド生成（sound_enabled状態に関係なく）
        sound_command = {
            'command': 'play_sound',
            'type': sound_type,
            'timestamp': len(self.sound_commands),
            'enabled': self.sound_enabled  # 実際の再生制御フラグ
        }
        
        self.sound_commands.append(sound_command)
        
        # 実際の再生はJavaScript側で実行
        if self.sound_enabled:
            print(f"サウンド再生コマンド: {sound_type}")
        else:
            print(f"サウンドコマンド（無音モード）: {sound_type}")
    
    def get_sound_commands_json(self) -> str:
        """サウンドコマンドをJSON形式で取得"""
        try:
            commands_json = json.dumps(self.sound_commands, ensure_ascii=False)
            self.sound_commands = []  # 送信後クリア
            return commands_json
        except Exception as e:
            print(f"サウンドコマンド変換エラー: {str(e)}")
            return "[]"

# === controller.web_game_controller モジュール ===
"""
Web環境対応ゲームコントローラー（JavaScript連携）

個人開発規約遵守:
- TDD必須: Web Controller操作のテスト
- モック禁止: 実際のWeb環境でのイベント処理確認
- エラー3要素: Web Controller操作時のエラーハンドリング検証

技術移行:
- Pygame event → JavaScript event対応
- 既存MVCパターンの移植
- Pyodide環境最適化
"""



class WebControllerError(Exception):
    """Web Controller専用例外クラス"""
    
    def __init__(self, message: str, error_code: str = "WEB_CONTROLLER_ERROR"):
        super().__init__(message)
        self.error_code = error_code


class WebGameController:
    """
    Web環境対応ゲームController（MVC層協調管理）
    
    責務:
    - JavaScript イベント処理とGameStateメソッドのバインド
    - GameStateとWebCanvasViewの協調管理
    - Web環境でのゲームループ制御
    - ブラウザユーザー入力の管理
    """
    
    def __init__(self, 
                 game_state: PygameGameState, 
                 canvas_view: WebCanvasView,
                 sound_view: Optional[WebSoundView] = None,
                 target_fps: float = 60.0):
        """
        Web Controllerの初期化
        
        Args:
            game_state: PygameGameState - 管理するゲーム状態
            canvas_view: WebCanvasView - 管理するCanvasビュー
            sound_view: WebSoundView - サウンドビュー（オプション）
            target_fps: float - 目標FPS（Web環境では制限的）
        """
        self.game_state = game_state
        self.canvas_view = canvas_view
        self.sound_view = sound_view or WebSoundView(sound_enabled=False)
        self.target_fps = target_fps
        
        # Web環境用タイマー制御
        self.frame_interval = 1.0 / target_fps
        self.last_frame_time = 0.0
        self.frame_count = 0
        
        # ゲームループ制御
        self.is_running = False
        self.is_paused = False
        
        # JavaScript連携用コールバック
        self.js_callbacks: Dict[str, Callable] = {}
        
        # Observer登録
        self._setup_observers()
        
        # 初期描画
        self._initial_draw()
        
        print(f"WebGameController初期化完了 - FPS: {target_fps}")
    
    def _setup_observers(self):
        """Observer関係の初期設定"""
        try:
            # CanvasViewをGameStateのObserverとして登録
            self.game_state.add_observer(self.canvas_view)
            
        except Exception as e:
            raise WebControllerError(
                f"Observer設定に失敗しました: {str(e)}",
                "OBSERVER_SETUP_ERROR"
            )
    
    def _initial_draw(self):
        """初期描画の実行"""
        try:
            # 初期状態をCanvasViewに通知
            self.canvas_view.on_game_state_changed(self.game_state)
            
        except Exception as e:
            print(f"初期描画警告: {str(e)} - ゲーム続行")
    
    def handle_mouse_motion(self, mouse_x: float):
        """
        マウス移動イベント処理（JavaScript連携）
        
        Args:
            mouse_x: float - マウスのX座標（Canvas座標系）
        """
        try:
            # ゲームオーバーまたはポーズ中は反映しない
            if self.game_state.is_gameover or self.game_state.paused:
                return
            
            # Canvas座標をゲーム座標に変換
            game_x = self._canvas_to_game_x(mouse_x)
            
            # ラケット位置更新
            self.game_state.update_racket_position(game_x)
            
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "マウス移動処理に失敗しました",
                'why': f"ラケット位置更新でエラーが発生: {str(e)}",
                'how': "ブラウザのマウス座標が正しく取得されているか確認してください"
            }
            print(f"マウス処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def handle_mouse_click(self, button: int):
        """
        マウスクリックイベント処理（JavaScript連携）
        
        Args:
            button: int - クリックボタン（0=左, 1=中, 2=右）
        """
        try:
            if button == 0:  # 左クリック
                self.game_state.reset_game()
                self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
                
        except Exception as e:
            error_msg = {
                'what': "クリック処理に失敗しました",
                'why': f"ゲームリセットでエラーが発生: {str(e)}",
                'how': "再度クリックしてください"
            }
            print(f"クリック処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def handle_key_press(self, key_code: str):
        """
        キー押下イベント処理（JavaScript連携）
        
        Args:
            key_code: str - 押下されたキーコード（"Space", "KeyR", "Escape"など）
        """
        try:
            if key_code == "Space":
                self.toggle_pause()
            elif key_code == "KeyR":
                self.game_state.reset_game()
            elif key_code == "Escape":
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
                self.canvas_view.update_window_title("Game Paused - Web Edition")
            else:
                self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
                
        except Exception as e:
            error_msg = {
                'what': "ポーズ切り替えに失敗しました",
                'why': f"ポーズ状態更新でエラーが発生: {str(e)}",
                'how': "スペースキーを再度押してください"
            }
            print(f"ポーズエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def update_game_frame(self) -> bool:
        """
        1フレーム分のゲーム更新（Web環境用）
        
        Returns:
            bool: 更新が実行された場合True
        """
        try:
            current_time = time.time()
            
            # フレームレート制御
            if current_time - self.last_frame_time < self.frame_interval:
                return False
            
            self.last_frame_time = current_time
            self.frame_count += 1
            
            # ポーズ中は物理演算をスキップ
            if self.game_state.paused or self.game_state.is_gameover:
                return True
            
            # ボール位置更新と衝突判定
            for ball in self.game_state.balls[:]:  # コピーでイテレート（削除対応）
                collision_occurred = self.game_state.update_ball_position(ball)
                
                # サウンド再生（衝突検出時）
                if collision_occurred:
                    self.sound_view.play_sound('hit')
            
            return True
            
        except Exception as e:
            error_msg = {
                'what': "ゲームフレーム更新に失敗しました",
                'why': f"物理演算処理でエラーが発生: {str(e)}",
                'how': "ブラウザを再読み込みしてください"
            }
            print(f"フレーム更新エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
    
    def _canvas_to_game_x(self, canvas_x: float) -> float:
        """
        Canvas座標をゲーム座標に変換
        
        Args:
            canvas_x: float - Canvas X座標
            
        Returns:
            float: ゲーム X座標
        """
        # Canvas座標とゲーム座標が同じ場合はそのまま返す
        # 必要に応じてスケーリング処理を追加
        return canvas_x
    
    def start_game_loop(self):
        """
        ゲームループ開始（Web環境用）
        
        Note: Web環境では実際のループはJavaScript側のrequestAnimationFrameで実行
        """
        self.is_running = True
        self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
        print("Web環境ゲームループ開始準備完了")
        print("実際のループはJavaScript側で実行されます")
    
    def stop_game(self):
        """ゲーム停止"""
        self.is_running = False
        print("ゲーム停止")
    
    def cleanup(self):
        """リソースクリーンアップ"""
        try:
            # Observer削除
            self.game_state.remove_observer(self.canvas_view)
            
            # 状態リセット
            self.is_running = False
            self.canvas_view.reset_frame_data()
            
            print("WebGameControllerのクリーンアップ完了")
            
        except Exception as e:
            print(f"クリーンアップ警告: {str(e)}")
    
    def get_current_fps(self) -> float:
        """現在のFPS計算"""
        if self.frame_count > 0:
            elapsed = time.time() - self.last_frame_time
            return 1.0 / elapsed if elapsed > 0 else 0.0
        return 0.0
    
    def get_javascript_interface(self) -> str:
        """
        JavaScript連携用の完全なインターフェースデータを取得
        
        Returns:
            str: JSON形式の統合データ
        """
        try:
            interface_data = {
                'canvas_data': json.loads(self.canvas_view.get_javascript_interface_data()),
                'sound_commands': json.loads(self.sound_view.get_sound_commands_json()),
                'controller_stats': self.get_game_statistics(),
                'frame_count': self.frame_count,
                'is_running': self.is_running,
                'target_fps': self.target_fps
            }
            
            return json.dumps(interface_data, ensure_ascii=False, indent=2)
            
        except Exception as e:
            error_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"データ統合処理でエラー: {str(e)}",
                    'how': "各コンポーネントの状態を個別に確認してください"
                }
            }
            return json.dumps(error_data, ensure_ascii=False)
    
    def get_game_statistics(self) -> Dict[str, Any]:
        """ゲーム統計情報取得"""
        return {
            'fps': self.get_current_fps(),
            'frame_interval': self.frame_interval,
            'target_fps': self.target_fps,
            'is_running': self.is_running,
            'game_paused': self.game_state.paused,
            'game_over': self.game_state.is_gameover,
            'score': self.game_state.score.point,
            'combo': self.game_state.score.combo,
            'balls_count': len(self.game_state.balls),
            'frame_count': self.frame_count,
            'canvas_size': self.canvas_view.get_canvas_size(),
            'performance_stats': self.canvas_view.get_performance_stats()
        }
    
    def register_js_callback(self, event_type: str, callback: Callable):
        """
        JavaScript連携用コールバック登録
        
        Args:
            event_type: str - イベントタイプ
            callback: Callable - コールバック関数
        """
        self.js_callbacks[event_type] = callback
    
    def execute_js_callback(self, event_type: str, data: Any = None):
        """
        JavaScript連携用コールバック実行
        
        Args:
            event_type: str - イベントタイプ
            data: Any - コールバックデータ
        """
        if event_type in self.js_callbacks:
            try:
                self.js_callbacks[event_type](data)
            except Exception as e:
                print(f"JSコールバック実行エラー ({event_type}): {str(e)}")

# === controller.web_game_controller_enhanced モジュール ===
"""
Web環境対応ゲームコントローラー（JavaScript連携）

個人開発規約遵守:
- TDD必須: Web Controller操作のテスト
- モック禁止: 実際のWeb環境でのイベント処理確認
- エラー3要素: Web Controller操作時のエラーハンドリング検証

技術移行:
- Pygame event → JavaScript event対応
- 既存MVCパターンの移植
- Pyodide環境最適化
"""



class WebControllerError(Exception):
    """Web Controller専用例外クラス"""
    
    def __init__(self, message: str, error_code: str = "WEB_CONTROLLER_ERROR"):
    try:
        super().__init__(message)
        self.error_code = error_code
    except Exception as e:
        print(f"Error in function: {e}")
        return None  # Safe fallback


class WebGameController:
    """
    Web環境対応ゲームController（MVC層協調管理）
    
    責務:
    - JavaScript イベント処理とGameStateメソッドのバインド
    - GameStateとWebCanvasViewの協調管理
    - Web環境でのゲームループ制御
    - ブラウザユーザー入力の管理
    """
    
    def __init__(self, 
                 game_state: PygameGameState, 
                 canvas_view: WebCanvasView,
                 sound_view: Optional[WebSoundView] = None,
                 target_fps: float = 60.0):
        """
        Web Controllerの初期化
        
        Args:
            game_state: PygameGameState - 管理するゲーム状態
            canvas_view: WebCanvasView - 管理するCanvasビュー
            sound_view: WebSoundView - サウンドビュー（オプション）
            target_fps: float - 目標FPS（Web環境では制限的）
        """
        self.game_state = game_state
        self.canvas_view = canvas_view
        self.sound_view = sound_view or WebSoundView(sound_enabled=False)
        self.target_fps = target_fps
        
        # Web環境用タイマー制御
        self.frame_interval = 1.0 / target_fps
        self.last_frame_time = 0.0
        self.frame_count = 0
        
        # ゲームループ制御
        self.is_running = False
        self.is_paused = False
        
        # JavaScript連携用コールバック
        self.js_callbacks: Dict[str, Callable] = {}
        
        # Observer登録
        self._setup_observers()
        
        # 初期描画
        self._initial_draw()
        
        print(f"WebGameController初期化完了 - FPS: {target_fps}")
    
    def _setup_observers(self):
        """Observer関係の初期設定"""
        try:
            # CanvasViewをGameStateのObserverとして登録
            self.game_state.add_observer(self.canvas_view)
            
        except Exception as e:
            raise WebControllerError(
                f"Observer設定に失敗しました: {str(e)}",
                "OBSERVER_SETUP_ERROR"
            )
    
    def _initial_draw(self):
        """初期描画の実行"""
        try:
            # 初期状態をCanvasViewに通知
            self.canvas_view.on_game_state_changed(self.game_state)
            
        except Exception as e:
            print(f"初期描画警告: {str(e)} - ゲーム続行")
    
    def handle_mouse_motion(self, mouse_x: float):
        """
        マウス移動イベント処理（JavaScript連携）
        
        Args:
            mouse_x: float - マウスのX座標（Canvas座標系）
        """
        try:
            # ゲームオーバーまたはポーズ中は反映しない
            if self.game_state.is_gameover or self.game_state.paused:
                return
            
            # Canvas座標をゲーム座標に変換
            game_x = self._canvas_to_game_x(mouse_x)
            
            # ラケット位置更新
            self.game_state.update_racket_position(game_x)
            
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "マウス移動処理に失敗しました",
                'why': f"ラケット位置更新でエラーが発生: {str(e)}",
                'how': "ブラウザのマウス座標が正しく取得されているか確認してください"
            }
            print(f"マウス処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def handle_mouse_click(self, button: int):
        """
        マウスクリックイベント処理（JavaScript連携）
        
        Args:
            button: int - クリックボタン（0=左, 1=中, 2=右）
        """
        try:
            if button == 0:  # 左クリック
                self.game_state.reset_game()
                self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
                
        except Exception as e:
            error_msg = {
                'what': "クリック処理に失敗しました",
                'why': f"ゲームリセットでエラーが発生: {str(e)}",
                'how': "再度クリックしてください"
            }
            print(f"クリック処理エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def handle_key_press(self, key_code: str):
        """
        キー押下イベント処理（JavaScript連携）
        
        Args:
            key_code: str - 押下されたキーコード（"Space", "KeyR", "Escape"など）
        """
        try:
            if key_code == "Space":
                self.toggle_pause()
            elif key_code == "KeyR":
                self.game_state.reset_game()
            elif key_code == "Escape":
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
                self.canvas_view.update_window_title("Game Paused - Web Edition")
            else:
                self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
                
        except Exception as e:
            error_msg = {
                'what': "ポーズ切り替えに失敗しました",
                'why': f"ポーズ状態更新でエラーが発生: {str(e)}",
                'how': "スペースキーを再度押してください"
            }
            print(f"ポーズエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def update_game_frame(self) -> bool:
        """
        1フレーム分のゲーム更新（Web環境用）
        
        Returns:
            bool: 更新が実行された場合True
        """
        try:
            current_time = time.time()
            
            # フレームレート制御
            if current_time - self.last_frame_time < self.frame_interval:
                return False
            
            self.last_frame_time = current_time
            self.frame_count += 1
            
            # ポーズ中は物理演算をスキップ
            if self.game_state.paused or self.game_state.is_gameover:
                return True
            
            # ボール位置更新と衝突判定
            for ball in self.game_state.balls[:]:  # コピーでイテレート（削除対応）
                collision_occurred = self.game_state.update_ball_position(ball)
                
                # サウンド再生（衝突検出時）
                if collision_occurred:
                    self.sound_view.play_sound('hit')
            
            return True
            
        except Exception as e:
            error_msg = {
                'what': "ゲームフレーム更新に失敗しました",
                'why': f"物理演算処理でエラーが発生: {str(e)}",
                'how': "ブラウザを再読み込みしてください"
            }
            print(f"フレーム更新エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
    
    def _canvas_to_game_x(self, canvas_x: float) -> float:
        """
        Canvas座標をゲーム座標に変換
        
        Args:
            canvas_x: float - Canvas X座標
            
        Returns:
            float: ゲーム X座標
        """
        # Canvas座標とゲーム座標が同じ場合はそのまま返す
        # 必要に応じてスケーリング処理を追加
        return canvas_x
    
    def start_game_loop(self):
        """
        ゲームループ開始（Web環境用）
        
        Note: Web環境では実際のループはJavaScript側のrequestAnimationFrameで実行
        """
        self.is_running = True
        self.canvas_view.update_window_title("Ultimate Squash Game - Web Edition")
        print("Web環境ゲームループ開始準備完了")
        print("実際のループはJavaScript側で実行されます")
    
    def stop_game(self):
        """ゲーム停止"""
        self.is_running = False
        print("ゲーム停止")
    
    def cleanup(self):
        """リソースクリーンアップ"""
        try:
            # Observer削除
            self.game_state.remove_observer(self.canvas_view)
            
            # 状態リセット
            self.is_running = False
            self.canvas_view.reset_frame_data()
            
            print("WebGameControllerのクリーンアップ完了")
            
        except Exception as e:
            print(f"クリーンアップ警告: {str(e)}")
    
    def get_current_fps(self) -> float:
        """現在のFPS計算"""
        if self.frame_count > 0:
            elapsed = time.time() - self.last_frame_time
            return 1.0 / elapsed if elapsed > 0 else 0.0
        return 0.0
    
    def get_javascript_interface(self) -> str:
        """
        JavaScript連携用の完全なインターフェースデータを取得
        
        Returns:
            str: JSON形式の統合データ
        """
        try:
            interface_data = {
                'canvas_data': json.loads(self.canvas_view.get_javascript_interface_data()),
                'sound_commands': json.loads(self.sound_view.get_sound_commands_json()),
                'controller_stats': self.get_game_statistics(),
                'frame_count': self.frame_count,
                'is_running': self.is_running,
                'target_fps': self.target_fps
            }
            
            return json.dumps(interface_data, ensure_ascii=False, indent=2)
            
        except Exception as e:
            error_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"データ統合処理でエラー: {str(e)}",
                    'how': "各コンポーネントの状態を個別に確認してください"
                }
            }
            return json.dumps(error_data, ensure_ascii=False)
    
    def get_game_statistics(self) -> Dict[str, Any]:
        """ゲーム統計情報取得"""
        return {
            'fps': self.get_current_fps(),
            'frame_interval': self.frame_interval,
            'target_fps': self.target_fps,
            'is_running': self.is_running,
            'game_paused': self.game_state.paused,
            'game_over': self.game_state.is_gameover,
            'score': self.game_state.score.point,
            'combo': self.game_state.score.combo,
            'balls_count': len(self.game_state.balls),
            'frame_count': self.frame_count,
            'canvas_size': self.canvas_view.get_canvas_size(),
            'performance_stats': self.canvas_view.get_performance_stats()
        }
    
    def register_js_callback(self, event_type: str, callback: Callable):
        """
        JavaScript連携用コールバック登録
        
        Args:
            event_type: str - イベントタイプ
            callback: Callable - コールバック関数
        """
        self.js_callbacks[event_type] = callback
    
    def execute_js_callback(self, event_type: str, data: Any = None):
        """
        JavaScript連携用コールバック実行
        
        Args:
            event_type: str - イベントタイプ
            data: Any - コールバックデータ
        """
        if event_type in self.js_callbacks:
            try:
                self.js_callbacks[event_type](data)
            except Exception as e:
                print(f"JSコールバック実行エラー ({event_type}): {str(e)}")

# === view.pygame_game_view モジュール ===
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
                if sys.platform.startswith('darwin'):  # macOS
                    if sound_type == 'wall':
                        os.system('afplay /System/Library/Sounds/Pop.aiff 2>/dev/null &')
                    elif sound_type == 'hit':
                        os.system('afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &')
                    elif sound_type == 'miss':
                        os.system('afplay /System/Library/Sounds/Sosumi.aiff 2>/dev/null &')
                        
        except Exception as e:
            print(f"サウンド再生エラー: {str(e)} - サウンドを無効化します")
            self.sound_enabled = False

# === controller.pygame_game_controller モジュール ===
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

# === model.pygame_game_state_enhanced モジュール ===
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



class PygameBall:
    
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
        try:
except ImportError:
    print("Warning: pygame not available, using fallback mode")
    pygame = None
        return pygame.Rect(
            self.x - self.radius,
            self.y - self.radius,
            self.size,
            self.size
        )
    
    def __repr__(self):
    try:
        return f"PygameBall(x={self.x}, y={self.y}, dx={self.dx}, dy={self.dy}, size={self.size}, color={self.color})"
    except Exception as e:
        print(f"Error in function: {e}")
        return None  # Safe fallback


class PygameRacket:
    
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
        try:
except ImportError:
    print("Warning: pygame not available, using fallback mode")
    pygame = None
        return pygame.Rect(self.x, self.y, self.size, self.height)
    
    def __repr__(self):
    try:
        return f"PygameRacket(x={self.x}, y={self.y}, size={self.size})"
    except Exception as e:
        print(f"Error in function: {e}")
        return None  # Safe fallback


class PygameScore:
    
    def __init__(self, point: int = 0, level: int = 1, combo: int = 0):
    try:
        self.point = int(point)
        self.level = int(level)
        self.combo = int(combo)
    
    def calculate_hit_score(self) -> int:
        """ヒット時のスコア計算（コンボボーナス含む）"""
        bonus = math.floor(self.combo / 5)
        return 10 * (1 + bonus)
    
    def __repr__(self):
        return f"PygameScore(point={self.point}, level={self.level}, combo={self.combo})"
    except Exception as e:
        print(f"Error in function: {e}")
        return None  # Safe fallback


class PygameGameStateObserver:
    
    def on_game_state_changed(self, game_state: 'PygameGameState'):
    try:
        """ゲーム状態変更時の通知"""
        raise NotImplementedError("Subclasses must implement on_game_state_changed")
    except Exception as e:
        print(f"Error in function: {e}")
        return None  # Safe fallback


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

# === view.raf_optimized_web_view モジュール ===
"""
RequestAnimationFrame最適化されたWeb Canvas View
Phase 3A: Canvas描画最適化（requestAnimationFrame統合）

主な最適化:
1. フレームレート制御（可変FPS対応）
2. アダプティブクオリティ（負荷に応じた品質調整）
3. フレームスキップ機能
4. 描画バジェット管理
5. パフォーマンスモニタリング強化
"""


class RAFOptimizedWebCanvasView(PygameGameStateObserver):
    """RequestAnimationFrame最適化されたCanvas描画ビュー"""
    
    def __init__(self, canvas_id: str = "gameCanvas"):
        self.canvas_id = canvas_id
        self.canvas_width = 640
        self.canvas_height = 480
        
        # RequestAnimationFrame最適化設定
        self.target_fps = 60
        self.frame_time_budget = 1000 / self.target_fps  # ms
        self.adaptive_quality = True
        self.vsync_enabled = True
        
        # フレーム管理
        self.last_frame_time = 0
        self.frame_delta = 0
        self.accumulated_time = 0
        self.frame_count = 0
        self.skipped_frames = 0
        
        # 品質レベル（0-3: 低品質～最高品質）
        self.quality_level = 3
        self.auto_quality_adjustment = True
        
        # パフォーマンス統計
        self.performance_stats = {
            'fps': 0,
            'frame_time': 0,
            'draw_calls': 0,
            'skipped_frames': 0,
            'quality_level': 3,
            'cpu_usage': 0,
            'gpu_estimate': 0,
            'frame_budget_usage': 0,
            'adaptive_actions': []
        }
        
        # 描画最適化
        self.batch_commands = []
        self.static_cache = None
        self.dynamic_elements = []
        self.dirty_regions = []
        
        # フレームバジェット
        self.draw_budget_ms = 10  # 描画に割り当てる最大時間
        self.update_budget_ms = 5  # 更新に割り当てる最大時間
        
        # 描画データ保存用
        self.frame_data = {}
        self.last_draw_commands = []
        self.frames_rendered = 0
        self.frames_skipped = 0
        self.current_fps = 0
        self.smoothed_frame_time = 0
        
    def prepare_frame(self, frame_data: Dict, delta_time: float) -> str:
        """
        RequestAnimationFrame用の最適化されたフレーム準備
        
        Args:
            frame_data: フレームデータ
            delta_time: 前フレームからの経過時間（秒）
            
        Returns:
            最適化された描画コマンドJSON
        """
        start_time = time.perf_counter()
        
        try:
            # フレームデルタ時間を更新
            self.frame_delta = delta_time
            self.accumulated_time += delta_time
            
            # FPS計算
            self.frame_count += 1
            if self.accumulated_time >= 1.0:
                self.performance_stats['fps'] = self.frame_count / self.accumulated_time
                self.frame_count = 0
                self.accumulated_time = 0
            
            # 品質レベルの自動調整
            if self.auto_quality_adjustment:
                self._adjust_quality_level()
            
            # フレームスキップ判定
            if self._should_skip_frame():
                self.skipped_frames += 1
                self.performance_stats['skipped_frames'] = self.skipped_frames
                return json.dumps({
                    'skip': True,
                    'reason': 'performance_optimization'
                })
            
            # 描画コマンド生成
            commands = self._generate_raf_optimized_commands(frame_data)
            
            # パフォーマンス統計更新
            end_time = time.perf_counter()
            frame_time = (end_time - start_time) * 1000  # ms
            self.performance_stats['frame_time'] = frame_time
            self.performance_stats['frame_budget_usage'] = frame_time / self.frame_time_budget
            
            return json.dumps({
                'commands': commands,
                'stats': self.performance_stats,
                'quality': self.quality_level,
                'vsync': self.vsync_enabled
            })
            
        except Exception as e:
            return json.dumps({
                'error': {
                    'what': 'RequestAnimationFrame最適化処理に失敗',
                    'why': f'フレーム準備中にエラー: {str(e)}',
                    'how': '品質レベルを下げるか、基本描画モードに切り替えてください'
                }
            })
    
    def _should_skip_frame(self) -> bool:
        """フレームスキップの判定"""
        # 前フレームが重かった場合
        if self.performance_stats.get('frame_time', 0) > self.frame_time_budget * 1.5:
            return True
            
        # FPSが目標の半分以下の場合
        current_fps = self.performance_stats.get('fps', self.target_fps)
        if current_fps < self.target_fps * 0.5 and current_fps > 0:
            return self.frame_count % 2 == 0  # 1フレームおきにスキップ
            
        return False
    
    def _adjust_quality_level(self):
        """品質レベルの動的調整"""
        # 自動調整が無効な場合は何もしない
        if not self.auto_quality_adjustment:
            return
            
        fps = self.performance_stats.get('fps', self.target_fps)
        frame_time = self.performance_stats.get('frame_time', 0)
        
        # 品質を下げる条件
        if fps < self.target_fps * 0.8 or frame_time > self.frame_time_budget * 1.2:
            if self.quality_level > 0:
                self.quality_level -= 1
                self.performance_stats['adaptive_actions'].append({
                    'action': 'quality_decreased',
                    'new_level': self.quality_level,
                    'reason': f'Low FPS: {fps:.1f}'
                })
        
        # 品質を上げる条件
        elif fps > self.target_fps * 0.95 and frame_time < self.frame_time_budget * 0.7:
            if self.quality_level < 3:
                self.quality_level += 1
                self.performance_stats['adaptive_actions'].append({
                    'action': 'quality_increased',
                    'new_level': self.quality_level,
                    'reason': f'Good performance: {fps:.1f} FPS'
                })
        
        # 統計を更新
        self.performance_stats['quality_level'] = self.quality_level
    
    def _generate_raf_optimized_commands(self, frame_data: Dict) -> List[Dict]:
        """RequestAnimationFrame最適化された描画コマンド生成"""
        commands = []
        
        # 品質レベルに応じた描画
        if self.quality_level == 0:
            # 最低品質: 基本要素のみ
            commands.extend(self._generate_minimal_commands(frame_data))
        elif self.quality_level == 1:
            # 低品質: 基本要素 + シンプルエフェクト
            commands.extend(self._generate_low_quality_commands(frame_data))
        elif self.quality_level == 2:
            # 中品質: 標準描画
            commands.extend(self._generate_medium_quality_commands(frame_data))
        else:
            # 高品質: フルエフェクト
            commands.extend(self._generate_high_quality_commands(frame_data))
        
        # バッチ最適化
        if len(commands) > 10:
            commands = self._batch_similar_commands(commands)
        
        return commands
    
    def _generate_minimal_commands(self, frame_data: Dict) -> List[Dict]:
        """最小限の描画コマンド（低負荷）"""
        commands = []
        
        # 背景（単色塗りつぶし）
        commands.append({
            'type': 'fillRect',
            'x': 0, 'y': 0,
            'width': self.canvas_width,
            'height': self.canvas_height,
            'color': '#000'
        })
        
        # ボール（単純な円）
        for ball in frame_data.get('balls', []):
            commands.append({
                'type': 'fillCircle',
                'x': ball['x'],
                'y': ball['y'],
                'radius': ball['radius'],
                'color': '#fff'
            })
        
        # ラケット（単純な矩形）
        for racket in frame_data.get('rackets', []):
            commands.append({
                'type': 'fillRect',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': '#0f0'
            })
        
        return commands
    
    def _generate_low_quality_commands(self, frame_data: Dict) -> List[Dict]:
        """低品質描画コマンド（基本エフェクト付き）"""
        commands = self._generate_minimal_commands(frame_data)
        
        # ボールの軌跡（短い）
        for ball in frame_data.get('balls', []):
            if 'trail' in ball and len(ball['trail']) > 0:
                # 最新の3点のみ
                for i, pos in enumerate(ball['trail'][-3:]):
                    commands.append({
                        'type': 'fillCircle',
                        'x': pos[0],
                        'y': pos[1],
                        'radius': ball['radius'] * 0.5,
                        'color': f'rgba(255,255,255,{0.2 * (i+1)/3})'
                    })
        
        return commands
    
    def _generate_medium_quality_commands(self, frame_data: Dict) -> List[Dict]:
        """中品質描画コマンド（標準）"""
        commands = []
        
        # グラデーション背景
        commands.append({
            'type': 'gradient',
            'x1': 0, 'y1': 0,
            'x2': 0, 'y2': self.canvas_height,
            'colors': ['#000428', '#004e92'],
            'rect': [0, 0, self.canvas_width, self.canvas_height]
        })
        
        # グリッドパターン
        commands.append({
            'type': 'grid',
            'spacing': 20,
            'color': 'rgba(255,255,255,0.05)'
        })
        
        # 標準的なゲーム要素描画
        commands.extend(self._generate_game_elements_medium(frame_data))
        
        return commands
    
    def _generate_high_quality_commands(self, frame_data: Dict) -> List[Dict]:
        """高品質描画コマンド（フルエフェクト）"""
        commands = []
        
        # 高品質背景とエフェクト
        commands.extend(self._generate_premium_background())
        
        # パーティクルエフェクト
        if 'particles' in frame_data:
            commands.extend(self._generate_particle_effects(frame_data['particles']))
        
        # 高品質ゲーム要素
        commands.extend(self._generate_game_elements_high(frame_data))
        
        # ポストプロセスエフェクト
        commands.extend(self._generate_post_effects(frame_data))
        
        return commands
    
    def _batch_similar_commands(self, commands: List[Dict]) -> List[Dict]:
        """類似コマンドのバッチ処理"""
        batched = []
        
        # 同じタイプのコマンドをグループ化
        circles = []
        rects = []
        others = []
        
        for cmd in commands:
            if cmd['type'] == 'fillCircle':
                circles.append(cmd)
            elif cmd['type'] == 'fillRect':
                rects.append(cmd)
            else:
                others.append(cmd)
        
        # バッチコマンドを作成
        if len(circles) > 3:
            batched.append({
                'type': 'batchCircles',
                'circles': circles
            })
        else:
            batched.extend(circles)
        
        if len(rects) > 3:
            batched.append({
                'type': 'batchRects',
                'rects': rects
            })
        else:
            batched.extend(rects)
        
        batched.extend(others)
        
        return batched
    
    def _generate_game_elements_medium(self, frame_data: Dict) -> List[Dict]:
        """中品質のゲーム要素描画"""
        commands = []
        
        # ボール
        for ball in frame_data.get('balls', []):
            # 影
            commands.append({
                'type': 'shadow',
                'blur': 10,
                'color': 'rgba(0,0,0,0.5)',
                'offsetX': 2,
                'offsetY': 2
            })
            
            # ボール本体
            commands.append({
                'type': 'fillCircle',
                'x': ball['x'],
                'y': ball['y'],
                'radius': ball['radius'],
                'color': '#fff'
            })
            
            # 軌跡
            if 'trail' in ball:
                for i, pos in enumerate(ball['trail'][-5:]):
                    commands.append({
                        'type': 'fillCircle',
                        'x': pos[0],
                        'y': pos[1],
                        'radius': ball['radius'] * (0.7 - i * 0.1),
                        'color': f'rgba(255,255,255,{0.3 - i * 0.05})'
                    })
        
        # ラケット
        for racket in frame_data.get('rackets', []):
            # グロウエフェクト
            commands.append({
                'type': 'glow',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': '#0f0',
                'blur': 15
            })
            
            # ラケット本体
            commands.append({
                'type': 'fillRect',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': racket.get('color', '#0f0')
            })
        
        return commands
    
    def _generate_game_elements_high(self, frame_data: Dict) -> List[Dict]:
        """高品質のゲーム要素描画"""
        commands = []
        
        # すべての中品質要素を含む
        commands.extend(self._generate_game_elements_medium(frame_data))
        
        # 追加の高品質エフェクト
        for ball in frame_data.get('balls', []):
            # 光沢エフェクト
            commands.append({
                'type': 'radialGradient',
                'x': ball['x'] - ball['radius'] * 0.3,
                'y': ball['y'] - ball['radius'] * 0.3,
                'r1': 0,
                'r2': ball['radius'] * 0.5,
                'colors': ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'],
                'circle': [ball['x'], ball['y'], ball['radius']]
            })
        
        return commands
    
    def _generate_premium_background(self) -> List[Dict]:
        """プレミアム背景エフェクト"""
        return [
            {
                'type': 'gradient',
                'x1': 0, 'y1': 0,
                'x2': self.canvas_width, 'y2': self.canvas_height,
                'colors': ['#0f0c29', '#302b63', '#24243e'],
                'rect': [0, 0, self.canvas_width, self.canvas_height]
            },
            {
                'type': 'pattern',
                'pattern': 'hexagon',
                'size': 30,
                'color': 'rgba(255,255,255,0.02)'
            }
        ]
    
    def _generate_particle_effects(self, particles: List[Dict]) -> List[Dict]:
        """パーティクルエフェクトの生成"""
        commands = []
        
        for particle in particles[:50]:  # 最大50パーティクル
            commands.append({
                'type': 'particle',
                'x': particle['x'],
                'y': particle['y'],
                'size': particle.get('size', 2),
                'color': particle.get('color', 'rgba(255,255,255,0.5)'),
                'blur': particle.get('blur', 0)
            })
        
        return commands
    
    def _generate_post_effects(self, frame_data: Dict) -> List[Dict]:
        """ポストプロセスエフェクト"""
        commands = []
        
        # スコア表示時のフラッシュエフェクト
        if frame_data.get('score_changed'):
            commands.append({
                'type': 'flash',
                'color': 'rgba(255,255,255,0.3)',
                'duration': 100
            })
        
        # ゲームオーバー時のエフェクト
        if frame_data.get('game_over'):
            commands.append({
                'type': 'vignette',
                'intensity': 0.5,
                'color': 'rgba(0,0,0,0.7)'
            })
        
        return commands
    
    def set_target_fps(self, fps: int):
        """目標FPSの設定"""
        self.target_fps = max(15, min(120, fps))
        self.frame_time_budget = 1000 / self.target_fps
    
    def enable_vsync(self, enabled: bool):
        """垂直同期の有効/無効"""
        self.vsync_enabled = enabled
    
    def set_quality_level(self, level: int):
        """品質レベルの手動設定"""
        self.quality_level = max(0, min(3, level))
        self.auto_quality_adjustment = False
    
    def enable_auto_quality(self, enabled: bool):
        """品質自動調整の有効/無効"""
        self.auto_quality_adjustment = enabled
    
    def get_performance_report(self) -> Dict:
        """詳細なパフォーマンスレポート"""
        return {
            'current_fps': self.performance_stats.get('fps', 0),
            'target_fps': self.target_fps,
            'quality_level': self.quality_level,
            'frame_time_avg': self.performance_stats.get('frame_time', 0),
            'frame_budget': self.frame_time_budget,
            'skipped_frames': self.skipped_frames,
            'vsync_enabled': self.vsync_enabled,
            'auto_quality': self.auto_quality_adjustment,
            'adaptive_history': self.performance_stats.get('adaptive_actions', [])[-10:]
        }
    
    def on_game_state_changed(self, game_state: PygameGameState):
        """ゲーム状態変更通知（Observerパターン）"""
        # ゲーム状態からフレームデータを生成
        self.frame_data = self._convert_game_state_to_frame_data(game_state)
        
        # RAFに適したフレーム準備
        delta_time = 0.016  # 60 FPSと仮定
        result = self.prepare_frame(self.frame_data, delta_time)
        
        # 結果をJSONとして解析し、描画コマンドを保存
        try:
            result_data = json.loads(result)
            if 'commands' in result_data:
                self.last_draw_commands = result_data['commands']
                self.frames_rendered += 1
            elif result_data.get('skip'):
                self.frames_skipped += 1
        except:
            pass
    
    def _convert_game_state_to_frame_data(self, game_state: PygameGameState) -> Dict:
        """ゲーム状態をフレームデータに変換"""
        # ボールデータ
        balls_data = []
        for ball in game_state.balls:
            balls_data.append({
                'x': ball.x,
                'y': ball.y,
                'radius': ball.radius,
                'trail': []  # 簡略化
            })
        
        # ラケットデータ  
        rackets_data = []
        if game_state.racket:
            rackets_data.append({
                'x': game_state.racket.x,
                'y': game_state.racket.y,
                'width': game_state.racket.size,
                'height': game_state.racket.height,
                'color': '#0f0'
            })
        
        return {
            'balls': balls_data,
            'rackets': rackets_data,
            'score_changed': False,
            'game_over': game_state.is_gameover
        }
    
    def get_javascript_interface_data(self) -> str:
        """JavaScript連携用データをJSON形式で取得"""
        interface_data = {
            'frame_data': self.frame_data,
            'draw_commands': self.last_draw_commands if self.last_draw_commands else [],
            'canvas_id': self.canvas_id,
            'frame_count': self.frame_count,
            'performance': {
                'fps': self.performance_stats.get('fps', 0),
                'frame_time': self.performance_stats.get('frame_time', 0),
                'quality_level': self.quality_level,
                'frames_rendered': self.frames_rendered,
                'frames_skipped': self.frames_skipped
            }
        }
        
        try:
            return json.dumps(interface_data, ensure_ascii=False, indent=None)
        except Exception as e:
            fallback_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"JSON変換でエラーが発生: {str(e)}",
                    'how': "データ形式を確認してください"
                }
            }
            return json.dumps(fallback_data, ensure_ascii=False)

# === view.optimized_web_game_view_enhanced モジュール ===
"""
最適化されたWeb環境対応ゲーム表示View（Canvas API統合）

個人開発規約遵守:
- TDD必須: パフォーマンス最適化のテスト
- モック禁止: 実際のCanvas API連携確認
- エラー3要素: 最適化エラー時の適切なメッセージ

パフォーマンス最適化:
- バッチ描画コマンド
- 差分更新システム
- メモリ効率的なデータ構造
"""



class OptimizedWebCanvasView(PygameGameStateObserver):
    """
    最適化されたWeb環境対応ゲーム描画View（Canvas API統合）
    
    最適化戦略:
    1. 差分描画: 変更された要素のみ更新
    2. バッチ処理: 複数の描画コマンドを統合
    3. オブジェクトプーリング: 描画コマンドの再利用
    4. レイヤー管理: 背景と動的要素の分離
    """
    
    def __init__(self, canvas_id: str = "gameCanvas", width: int = 640, height: int = 480):
        """
        最適化Web Canvas Viewの初期化
        
        Args:
            canvas_id: str - HTML Canvas要素のID
            width: int - キャンバス幅
            height: int - キャンバス高さ
        """
        self.canvas_id = canvas_id
        self.width = width
        self.height = height
        
        # 描画状態管理
        self.frame_count = 0
        self.draw_commands = []
        self.current_frame_data = {}
        
        # 最適化用データ構造
        self.previous_frame_data = {}
        self.static_layer_commands = []  # 静的要素（背景、UI）
        self.dynamic_layer_commands = []  # 動的要素（ボール、ラケット）
        self.dirty_regions: Set[tuple] = set()  # 更新が必要な領域
        
        # コマンドプール（再利用）
        self.command_pool = []
        self.max_pool_size = 100
        
        # パフォーマンス統計
        self.performance_stats = {
            'total_commands': 0,
            'reused_commands': 0,
            'skipped_updates': 0,
            'dirty_regions': 0
        }
        
        # エラー処理
        self.last_error = None
        
        # 初期静的レイヤー生成
        self._initialize_static_layer()
        
        print(f"OptimizedWebCanvasView初期化完了: {canvas_id} ({width}x{height})")
    
    def _initialize_static_layer(self):
        """静的レイヤーの初期化（背景、UI要素）"""
        # 背景
        self.static_layer_commands.append({
            'command': 'set_layer',
            'layer': 'static'
        })
        
        # グリッドパターン（軽量な背景）
        self.static_layer_commands.append({
            'command': 'draw_grid',
            'spacing': 50,
            'color': 'rgba(200, 200, 200, 0.3)'
        })
        
        # UI領域（スコアエリア）
        self.static_layer_commands.append({
            'command': 'draw_ui_background',
            'x': 0,
            'y': 0,
            'width': self.width,
            'height': 80,
            'color': 'rgba(0, 0, 0, 0.1)'
        })
    
    def on_game_state_changed(self, game_state: PygameGameState):
        """
        ゲーム状態変更通知（Observerパターン）- 最適化版
        
        Args:
            game_state: PygameGameState - 変更されたゲーム状態
        """
        try:
            # フレームデータ生成
            frame_data = self._convert_game_state_to_canvas_data(game_state)
            
            # 差分検出
            changed_elements = self._detect_changes(frame_data)
            
            # 実際に変更があるかチェック
            has_changes = (changed_elements['all_changed'] or 
                          len(changed_elements['balls']) > 0 or
                          changed_elements['racket'] is not None or
                          changed_elements['score'] is not None or
                          changed_elements['game_state'] is not None)
            
            if has_changes:
                # 変更がある場合のみコマンド生成
                draw_commands = self._generate_optimized_draw_commands(
                    frame_data, 
                    changed_elements
                )
                
                self.current_frame_data = frame_data
                self.draw_commands = draw_commands
                self.frame_count += 1
                
                # 統計更新
                self.performance_stats['total_commands'] += len(draw_commands)
            else:
                # 変更なし - スキップ
                self.performance_stats['skipped_updates'] += 1
                self.draw_commands = [{
                    'command': 'skip_frame',
                    'reason': 'no_changes'
                }]
            
            # 前フレームデータ更新
            self.previous_frame_data = frame_data.copy()
            
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "最適化Canvas描画データ準備に失敗しました",
                'why': f"差分検出または最適化処理でエラーが発生: {str(e)}",
                'how': "ゲーム状態を確認し、必要に応じて通常描画モードに切り替えてください"
            }
            print(f"最適化エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            self.last_error = error_msg
            
            # フォールバック: 通常描画
            self._fallback_to_normal_rendering(game_state)
    
    def _detect_changes(self, frame_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        フレーム間の差分検出
        
        Args:
            frame_data: Dict[str, Any] - 現在のフレームデータ
            
        Returns:
            Dict[str, Any]: 変更された要素のリスト
        """
        if not self.previous_frame_data:
            # 初回は全要素が変更
            return {
                'all_changed': True,
                'balls': frame_data.get('balls', []),
                'racket': frame_data.get('racket'),
                'score': frame_data.get('score'),
                'game_state': frame_data.get('game_state')
            }
        
        changes = {
            'all_changed': False,
            'balls': [],
            'racket': None,
            'score': None,
            'game_state': None
        }
        
        # ボールの変更検出
        prev_balls = self.previous_frame_data.get('balls', [])
        curr_balls = frame_data.get('balls', [])
        
        for i, ball in enumerate(curr_balls):
            if i >= len(prev_balls) or self._has_ball_changed(prev_balls[i], ball):
                changes['balls'].append((i, ball))
                # ダーティリージョン追加
                self._add_dirty_region(ball['x'], ball['y'], ball['radius'] * 2)
        
        # ラケットの変更検出
        prev_racket = self.previous_frame_data.get('racket')
        curr_racket = frame_data.get('racket')
        
        if self._has_racket_changed(prev_racket, curr_racket):
            changes['racket'] = curr_racket
            if curr_racket:
                self._add_dirty_region(
                    curr_racket['x'], 
                    curr_racket['y'], 
                    curr_racket['width'], 
                    curr_racket['height']
                )
        
        # スコアの変更検出
        prev_score = self.previous_frame_data.get('score', {})
        curr_score = frame_data.get('score', {})
        
        if (prev_score.get('point') != curr_score.get('point') or
            prev_score.get('combo') != curr_score.get('combo')):
            changes['score'] = curr_score
        
        # ゲーム状態の変更検出
        prev_state = self.previous_frame_data.get('game_state', {})
        curr_state = frame_data.get('game_state', {})
        
        if (prev_state.get('is_gameover') != curr_state.get('is_gameover') or
            prev_state.get('paused') != curr_state.get('paused')):
            changes['game_state'] = curr_state
        
        return changes
    
    def _has_ball_changed(self, prev_ball: Dict, curr_ball: Dict) -> bool:
        """ボールの変更検出"""
        return (abs(prev_ball.get('x', 0) - curr_ball.get('x', 0)) > 0.5 or
                abs(prev_ball.get('y', 0) - curr_ball.get('y', 0)) > 0.5 or
                prev_ball.get('color') != curr_ball.get('color'))
    
    def _has_racket_changed(self, prev_racket: Optional[Dict], curr_racket: Optional[Dict]) -> bool:
        """ラケットの変更検出"""
        if prev_racket is None and curr_racket is None:
            return False
        if prev_racket is None or curr_racket is None:
            return True
        return abs(prev_racket.get('x', 0) - curr_racket.get('x', 0)) > 0.5
    
    def _add_dirty_region(self, x: float, y: float, width: float, height: float = None):
        """ダーティリージョンの追加"""
        if height is None:
            # 円形の場合（widthは直径）
            radius = width / 2
            region = (int(x - radius), int(y - radius), int(width), int(width))
        else:
            # 矩形の場合
            region = (int(x), int(y), int(width), int(height))
        
        self.dirty_regions.add(region)
        self.performance_stats['dirty_regions'] = len(self.dirty_regions)
    
    def _generate_optimized_draw_commands(self, frame_data: Dict[str, Any], 
                                         changes: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        最適化された描画コマンド生成
        
        Args:
            frame_data: Dict[str, Any] - フレームデータ
            changes: Dict[str, Any] - 変更要素
            
        Returns:
            List[Dict[str, Any]]: 最適化された描画コマンドリスト
        """
        commands = []
        
        # レイヤー設定
        if changes['all_changed']:
            # 全体再描画
            commands.append(self._get_command('clear', {'color': 'rgb(240, 240, 240)'}))
            commands.extend(self.static_layer_commands)
        else:
            # 差分描画モード
            commands.append({
                'command': 'set_mode',
                'mode': 'differential',
                'regions': list(self.dirty_regions)
            })
        
        # 動的レイヤー
        commands.append({
            'command': 'set_layer',
            'layer': 'dynamic'
        })
        
        # ボール描画（変更分のみ）
        if changes['balls']:
            # バッチ描画コマンド
            ball_batch = {
                'command': 'draw_batch_circles',
                'circles': []
            }
            
            # 初回フレーム（all_changed=True）の場合
            if changes['all_changed']:
                for index, ball in enumerate(changes['balls']):
                    ball_batch['circles'].append({
                        'id': f'ball_{index}',
                        'x': ball['x'],
                        'y': ball['y'],
                        'radius': ball['radius'],
                        'color': ball['color']
                    })
            else:
                # 差分フレームの場合（(index, ball)のタプル形式）
                for index, ball in changes['balls']:
                    ball_batch['circles'].append({
                        'id': f'ball_{index}',
                        'x': ball['x'],
                        'y': ball['y'],
                        'radius': ball['radius'],
                        'color': ball['color']
                    })
            
            commands.append(ball_batch)
        
        # ラケット描画（変更時のみ）
        if changes['racket']:
            racket = changes['racket']
            commands.append(self._get_command('draw_rectangle', {
                'id': 'racket',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': racket['color']
            }))
        
        # UIレイヤー（スコア等）
        if changes['score'] or changes['game_state']:
            commands.append({
                'command': 'set_layer',
                'layer': 'ui'
            })
            
            if changes['score']:
                score = changes['score']
                commands.append({
                    'command': 'update_text',
                    'id': 'score_text',
                    'text': f"Score: {score['point']} | Combo: {score['combo']}",
                    'x': 10,
                    'y': 30,
                    'font': '24px Arial',
                    'color': 'rgb(0, 0, 0)'
                })
            
            if changes['game_state']:
                state = changes['game_state']
                if state['paused']:
                    commands.append(self._get_overlay_command('PAUSED', 'rgba(0, 0, 0, 0.5)'))
                elif state['is_gameover']:
                    commands.append(self._get_overlay_command('GAME OVER', 'rgba(255, 0, 0, 0.7)'))
        
        # ダーティリージョンクリア
        self.dirty_regions.clear()
        
        return commands
    
    def _get_command(self, command_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """コマンドプールからコマンド取得または生成"""
        if self.command_pool:
            cmd = self.command_pool.pop()
            cmd.clear()
            cmd['command'] = command_type
            cmd.update(params)
            self.performance_stats['reused_commands'] += 1
            return cmd
        else:
            params['command'] = command_type
            return params
    
    def _return_command_to_pool(self, command: Dict[str, Any]):
        """使用済みコマンドをプールに返却"""
        if len(self.command_pool) < self.max_pool_size:
            self.command_pool.append(command)
    
    def _get_overlay_command(self, text: str, bg_color: str) -> Dict[str, Any]:
        """オーバーレイ表示コマンド生成"""
        return {
            'command': 'draw_overlay',
            'text': text,
            'x': self.width // 2,
            'y': self.height // 2,
            'font': '48px Arial',
            'textColor': 'white',
            'backgroundColor': bg_color,
            'padding': 20
        }
    
    def _fallback_to_normal_rendering(self, game_state: PygameGameState):
        """通常描画へのフォールバック"""
        # 基本的な全画面再描画コマンド生成
        self.draw_commands = [
            {'command': 'clear', 'color': 'rgb(240, 240, 240)'},
            {'command': 'fallback_mode', 'reason': 'optimization_error'}
        ]
    
    def get_javascript_interface_data(self) -> str:
        """
        JavaScript連携用データをJSON形式で取得 - 最適化版
        
        Returns:
            str: JSON形式の描画データ
        """
        interface_data = {
            'frame_data': self.current_frame_data,
            'draw_commands': self.draw_commands,
            'canvas_id': self.canvas_id,
            'frame_count': self.frame_count,
            'optimization_stats': self.performance_stats,
            'error': self.last_error
        }
        
        try:
            return json.dumps(interface_data, ensure_ascii=False, indent=None)  # indentなしで軽量化
        except Exception as e:
            # JSON変換エラー時のフォールバック
            fallback_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"JSON変換でエラーが発生: {str(e)}",
                    'how': "データ形式を確認し、JavaScript側のエラーハンドリングを実装してください"
                }
            }
            return json.dumps(fallback_data, ensure_ascii=False)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """パフォーマンス統計レポート取得"""
        total_commands = self.performance_stats['total_commands']
        reused = self.performance_stats['reused_commands']
        
        return {
            'total_frames': self.frame_count,
            'total_commands': total_commands,
            'reused_commands': reused,
            'reuse_rate': (reused / total_commands * 100) if total_commands > 0 else 0,
            'skipped_updates': self.performance_stats['skipped_updates'],
            'skip_rate': (self.performance_stats['skipped_updates'] / self.frame_count * 100) if self.frame_count > 0 else 0,
            'avg_dirty_regions': self.performance_stats['dirty_regions'] / self.frame_count if self.frame_count > 0 else 0,
            'command_pool_size': len(self.command_pool)
        }
    
    def reset_performance_stats(self):
        """パフォーマンス統計リセット"""
        self.performance_stats = {
            'total_commands': 0,
            'reused_commands': 0,
            'skipped_updates': 0,
            'dirty_regions': 0
        }
        self.frame_count = 0
    
    # 既存メソッドは親クラスから継承
    def _convert_game_state_to_canvas_data(self, game_state: PygameGameState) -> Dict[str, Any]:
        """親クラスの実装を使用（変更なし）"""
        # ボールデータ変換
        balls_data = []
        for ball in game_state.balls:
            ball_data = {
                'x': float(ball.x),
                'y': float(ball.y),
                'radius': float(ball.radius),
                'color': self._rgb_to_css_color(ball.color),
                'dx': float(ball.dx),
                'dy': float(ball.dy)
            }
            balls_data.append(ball_data)
        
        # ラケットデータ変換
        racket_data = None
        if game_state.racket:
            racket_data = {
                'x': float(game_state.racket.x),
                'y': float(game_state.racket.y),
                'width': float(game_state.racket.size),
                'height': float(game_state.racket.height),
                'color': self._rgb_to_css_color(game_state.racket.color)
            }
        
        # スコアデータ変換
        score_data = {
            'point': int(game_state.score.point),
            'combo': int(game_state.score.combo),
            'level': int(game_state.score.level)
        }
        
        # ゲーム状態データ
        game_data = {
            'is_gameover': bool(game_state.is_gameover),
            'paused': bool(game_state.paused),
            'frame_count': self.frame_count
        }
        
        return {
            'canvas_id': self.canvas_id,
            'width': self.width,
            'height': self.height,
            'balls': balls_data,
            'racket': racket_data,
            'score': score_data,
            'game_state': game_data,
            'timestamp': self.frame_count
        }
    
    def _rgb_to_css_color(self, rgb_tuple) -> str:
        """RGB tupleをCSS color文字列に変換"""
        if isinstance(rgb_tuple, tuple) and len(rgb_tuple) == 3:
            r, g, b = rgb_tuple
            return f"rgb({int(r)}, {int(g)}, {int(b)})"
        else:
            return "rgb(255, 0, 0)"  # デフォルト赤色

# === view.optimized_web_game_view モジュール ===
"""
最適化されたWeb環境対応ゲーム表示View（Canvas API統合）

個人開発規約遵守:
- TDD必須: パフォーマンス最適化のテスト
- モック禁止: 実際のCanvas API連携確認
- エラー3要素: 最適化エラー時の適切なメッセージ

パフォーマンス最適化:
- バッチ描画コマンド
- 差分更新システム
- メモリ効率的なデータ構造
"""


# 相対インポートの代替案として絶対インポートを試行
try:
except ImportError:
    # CI環境などで相対インポートが失敗した場合の絶対インポートフォールバック
    current_dir = os.path.dirname(__file__)
    project_root = os.path.join(current_dir, '..', '..')


class OptimizedWebCanvasView(PygameGameStateObserver):
    """
    最適化されたWeb環境対応ゲーム描画View（Canvas API統合）
    
    最適化戦略:
    1. 差分描画: 変更された要素のみ更新
    2. バッチ処理: 複数の描画コマンドを統合
    3. オブジェクトプーリング: 描画コマンドの再利用
    4. レイヤー管理: 背景と動的要素の分離
    """
    
    def __init__(self, canvas_id: str = "gameCanvas", width: int = 640, height: int = 480):
        """
        最適化Web Canvas Viewの初期化
        
        Args:
            canvas_id: str - HTML Canvas要素のID
            width: int - キャンバス幅
            height: int - キャンバス高さ
        """
        self.canvas_id = canvas_id
        self.width = width
        self.height = height
        
        # 描画状態管理
        self.frame_count = 0
        self.draw_commands = []
        self.current_frame_data = {}
        
        # 最適化用データ構造
        self.previous_frame_data = {}
        self.static_layer_commands = []  # 静的要素（背景、UI）
        self.dynamic_layer_commands = []  # 動的要素（ボール、ラケット）
        self.dirty_regions: Set[tuple] = set()  # 更新が必要な領域
        
        # コマンドプール（再利用）
        self.command_pool = []
        self.max_pool_size = 100
        
        # パフォーマンス統計
        self.performance_stats = {
            'total_commands': 0,
            'reused_commands': 0,
            'skipped_updates': 0,
            'dirty_regions': 0
        }
        
        # エラー処理
        self.last_error = None
        
        # 初期静的レイヤー生成
        self._initialize_static_layer()
        
        print(f"OptimizedWebCanvasView初期化完了: {canvas_id} ({width}x{height})")
    
    def _initialize_static_layer(self):
        """静的レイヤーの初期化（背景、UI要素）"""
        # 背景
        self.static_layer_commands.append({
            'command': 'set_layer',
            'layer': 'static'
        })
        
        # グリッドパターン（軽量な背景）
        self.static_layer_commands.append({
            'command': 'draw_grid',
            'spacing': 50,
            'color': 'rgba(200, 200, 200, 0.3)'
        })
        
        # UI領域（スコアエリア）
        self.static_layer_commands.append({
            'command': 'draw_ui_background',
            'x': 0,
            'y': 0,
            'width': self.width,
            'height': 80,
            'color': 'rgba(0, 0, 0, 0.1)'
        })
    
    def on_game_state_changed(self, game_state: PygameGameState):
        """
        ゲーム状態変更通知（Observerパターン）- 最適化版
        
        Args:
            game_state: PygameGameState - 変更されたゲーム状態
        """
        try:
            # フレームデータ生成
            frame_data = self._convert_game_state_to_canvas_data(game_state)
            
            # 差分検出
            changed_elements = self._detect_changes(frame_data)
            
            # 実際に変更があるかチェック
            has_changes = (changed_elements['all_changed'] or 
                          len(changed_elements['balls']) > 0 or
                          changed_elements['racket'] is not None or
                          changed_elements['score'] is not None or
                          changed_elements['game_state'] is not None)
            
            if has_changes:
                # 変更がある場合のみコマンド生成
                draw_commands = self._generate_optimized_draw_commands(
                    frame_data, 
                    changed_elements
                )
                
                self.current_frame_data = frame_data
                self.draw_commands = draw_commands
                self.frame_count += 1
                
                # 統計更新
                self.performance_stats['total_commands'] += len(draw_commands)
            else:
                # 変更なし - スキップ
                self.performance_stats['skipped_updates'] += 1
                self.draw_commands = [{
                    'command': 'skip_frame',
                    'reason': 'no_changes'
                }]
            
            # 前フレームデータ更新
            self.previous_frame_data = frame_data.copy()
            
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "最適化Canvas描画データ準備に失敗しました",
                'why': f"差分検出または最適化処理でエラーが発生: {str(e)}",
                'how': "ゲーム状態を確認し、必要に応じて通常描画モードに切り替えてください"
            }
            print(f"最適化エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            self.last_error = error_msg
            
            # フォールバック: 通常描画
            self._fallback_to_normal_rendering(game_state)
    
    def _detect_changes(self, frame_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        フレーム間の差分検出
        
        Args:
            frame_data: Dict[str, Any] - 現在のフレームデータ
            
        Returns:
            Dict[str, Any]: 変更された要素のリスト
        """
        if not self.previous_frame_data:
            # 初回は全要素が変更
            return {
                'all_changed': True,
                'balls': frame_data.get('balls', []),
                'racket': frame_data.get('racket'),
                'score': frame_data.get('score'),
                'game_state': frame_data.get('game_state')
            }
        
        changes = {
            'all_changed': False,
            'balls': [],
            'racket': None,
            'score': None,
            'game_state': None
        }
        
        # ボールの変更検出
        prev_balls = self.previous_frame_data.get('balls', [])
        curr_balls = frame_data.get('balls', [])
        
        for i, ball in enumerate(curr_balls):
            if i >= len(prev_balls) or self._has_ball_changed(prev_balls[i], ball):
                changes['balls'].append((i, ball))
                # ダーティリージョン追加
                self._add_dirty_region(ball['x'], ball['y'], ball['radius'] * 2)
        
        # ラケットの変更検出
        prev_racket = self.previous_frame_data.get('racket')
        curr_racket = frame_data.get('racket')
        
        if self._has_racket_changed(prev_racket, curr_racket):
            changes['racket'] = curr_racket
            if curr_racket:
                self._add_dirty_region(
                    curr_racket['x'], 
                    curr_racket['y'], 
                    curr_racket['width'], 
                    curr_racket['height']
                )
        
        # スコアの変更検出
        prev_score = self.previous_frame_data.get('score', {})
        curr_score = frame_data.get('score', {})
        
        if (prev_score.get('point') != curr_score.get('point') or
            prev_score.get('combo') != curr_score.get('combo')):
            changes['score'] = curr_score
        
        # ゲーム状態の変更検出
        prev_state = self.previous_frame_data.get('game_state', {})
        curr_state = frame_data.get('game_state', {})
        
        if (prev_state.get('is_gameover') != curr_state.get('is_gameover') or
            prev_state.get('paused') != curr_state.get('paused')):
            changes['game_state'] = curr_state
        
        return changes
    
    def _has_ball_changed(self, prev_ball: Dict, curr_ball: Dict) -> bool:
        """ボールの変更検出"""
        return (abs(prev_ball.get('x', 0) - curr_ball.get('x', 0)) > 0.5 or
                abs(prev_ball.get('y', 0) - curr_ball.get('y', 0)) > 0.5 or
                prev_ball.get('color') != curr_ball.get('color'))
    
    def _has_racket_changed(self, prev_racket: Optional[Dict], curr_racket: Optional[Dict]) -> bool:
        """ラケットの変更検出"""
        if prev_racket is None and curr_racket is None:
            return False
        if prev_racket is None or curr_racket is None:
            return True
        return abs(prev_racket.get('x', 0) - curr_racket.get('x', 0)) > 0.5
    
    def _add_dirty_region(self, x: float, y: float, width: float, height: float = None):
        """ダーティリージョンの追加"""
        if height is None:
            # 円形の場合（widthは直径）
            radius = width / 2
            region = (int(x - radius), int(y - radius), int(width), int(width))
        else:
            # 矩形の場合
            region = (int(x), int(y), int(width), int(height))
        
        self.dirty_regions.add(region)
        self.performance_stats['dirty_regions'] = len(self.dirty_regions)
    
    def _generate_optimized_draw_commands(self, frame_data: Dict[str, Any], 
                                         changes: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        最適化された描画コマンド生成
        
        Args:
            frame_data: Dict[str, Any] - フレームデータ
            changes: Dict[str, Any] - 変更要素
            
        Returns:
            List[Dict[str, Any]]: 最適化された描画コマンドリスト
        """
        commands = []
        
        # レイヤー設定
        if changes['all_changed']:
            # 全体再描画
            commands.append(self._get_command('clear', {'color': 'rgb(240, 240, 240)'}))
            commands.extend(self.static_layer_commands)
        else:
            # 差分描画モード
            commands.append({
                'command': 'set_mode',
                'mode': 'differential',
                'regions': list(self.dirty_regions)
            })
        
        # 動的レイヤー
        commands.append({
            'command': 'set_layer',
            'layer': 'dynamic'
        })
        
        # ボール描画（変更分のみ）
        if changes['balls']:
            # バッチ描画コマンド
            ball_batch = {
                'command': 'draw_batch_circles',
                'circles': []
            }
            
            # 初回フレーム（all_changed=True）の場合
            if changes['all_changed']:
                for index, ball in enumerate(changes['balls']):
                    ball_batch['circles'].append({
                        'id': f'ball_{index}',
                        'x': ball['x'],
                        'y': ball['y'],
                        'radius': ball['radius'],
                        'color': ball['color']
                    })
            else:
                # 差分フレームの場合（(index, ball)のタプル形式）
                for index, ball in changes['balls']:
                    ball_batch['circles'].append({
                        'id': f'ball_{index}',
                        'x': ball['x'],
                        'y': ball['y'],
                        'radius': ball['radius'],
                        'color': ball['color']
                    })
            
            commands.append(ball_batch)
        
        # ラケット描画（変更時のみ）
        if changes['racket']:
            racket = changes['racket']
            commands.append(self._get_command('draw_rectangle', {
                'id': 'racket',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': racket['color']
            }))
        
        # UIレイヤー（スコア等）
        if changes['score'] or changes['game_state']:
            commands.append({
                'command': 'set_layer',
                'layer': 'ui'
            })
            
            if changes['score']:
                score = changes['score']
                commands.append({
                    'command': 'update_text',
                    'id': 'score_text',
                    'text': f"Score: {score['point']} | Combo: {score['combo']}",
                    'x': 10,
                    'y': 30,
                    'font': '24px Arial',
                    'color': 'rgb(0, 0, 0)'
                })
            
            if changes['game_state']:
                state = changes['game_state']
                if state['paused']:
                    commands.append(self._get_overlay_command('PAUSED', 'rgba(0, 0, 0, 0.5)'))
                elif state['is_gameover']:
                    commands.append(self._get_overlay_command('GAME OVER', 'rgba(255, 0, 0, 0.7)'))
        
        # ダーティリージョンクリア
        self.dirty_regions.clear()
        
        return commands
    
    def _get_command(self, command_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """コマンドプールからコマンド取得または生成"""
        if self.command_pool:
            cmd = self.command_pool.pop()
            cmd.clear()
            cmd['command'] = command_type
            cmd.update(params)
            self.performance_stats['reused_commands'] += 1
            return cmd
        else:
            params['command'] = command_type
            return params
    
    def _return_command_to_pool(self, command: Dict[str, Any]):
        """使用済みコマンドをプールに返却"""
        if len(self.command_pool) < self.max_pool_size:
            self.command_pool.append(command)
    
    def _get_overlay_command(self, text: str, bg_color: str) -> Dict[str, Any]:
        """オーバーレイ表示コマンド生成"""
        return {
            'command': 'draw_overlay',
            'text': text,
            'x': self.width // 2,
            'y': self.height // 2,
            'font': '48px Arial',
            'textColor': 'white',
            'backgroundColor': bg_color,
            'padding': 20
        }
    
    def _fallback_to_normal_rendering(self, game_state: PygameGameState):
        """通常描画へのフォールバック"""
        # 基本的な全画面再描画コマンド生成
        self.draw_commands = [
            {'command': 'clear', 'color': 'rgb(240, 240, 240)'},
            {'command': 'fallback_mode', 'reason': 'optimization_error'}
        ]
    
    def get_javascript_interface_data(self) -> str:
        """
        JavaScript連携用データをJSON形式で取得 - 最適化版
        
        Returns:
            str: JSON形式の描画データ
        """
        interface_data = {
            'frame_data': self.current_frame_data,
            'draw_commands': self.draw_commands,
            'canvas_id': self.canvas_id,
            'frame_count': self.frame_count,
            'optimization_stats': self.performance_stats,
            'error': self.last_error
        }
        
        try:
            return json.dumps(interface_data, ensure_ascii=False, indent=None)  # indentなしで軽量化
        except Exception as e:
            # JSON変換エラー時のフォールバック
            fallback_data = {
                'error': {
                    'what': "JavaScript連携データの生成に失敗しました",
                    'why': f"JSON変換でエラーが発生: {str(e)}",
                    'how': "データ形式を確認し、JavaScript側のエラーハンドリングを実装してください"
                }
            }
            return json.dumps(fallback_data, ensure_ascii=False)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """パフォーマンス統計レポート取得"""
        total_commands = self.performance_stats['total_commands']
        reused = self.performance_stats['reused_commands']
        
        return {
            'total_frames': self.frame_count,
            'total_commands': total_commands,
            'reused_commands': reused,
            'reuse_rate': (reused / total_commands * 100) if total_commands > 0 else 0,
            'skipped_updates': self.performance_stats['skipped_updates'],
            'skip_rate': (self.performance_stats['skipped_updates'] / self.frame_count * 100) if self.frame_count > 0 else 0,
            'avg_dirty_regions': self.performance_stats['dirty_regions'] / self.frame_count if self.frame_count > 0 else 0,
            'command_pool_size': len(self.command_pool)
        }
    
    def reset_performance_stats(self):
        """パフォーマンス統計リセット"""
        self.performance_stats = {
            'total_commands': 0,
            'reused_commands': 0,
            'skipped_updates': 0,
            'dirty_regions': 0
        }
        self.frame_count = 0
    
    # 既存メソッドは親クラスから継承
    def _convert_game_state_to_canvas_data(self, game_state: PygameGameState) -> Dict[str, Any]:
        """親クラスの実装を使用（変更なし）"""
        # ボールデータ変換
        balls_data = []
        for ball in game_state.balls:
            ball_data = {
                'x': float(ball.x),
                'y': float(ball.y),
                'radius': float(ball.radius),
                'color': self._rgb_to_css_color(ball.color),
                'dx': float(ball.dx),
                'dy': float(ball.dy)
            }
            balls_data.append(ball_data)
        
        # ラケットデータ変換
        racket_data = None
        if game_state.racket:
            racket_data = {
                'x': float(game_state.racket.x),
                'y': float(game_state.racket.y),
                'width': float(game_state.racket.size),
                'height': float(game_state.racket.height),
                'color': self._rgb_to_css_color(game_state.racket.color)
            }
        
        # スコアデータ変換
        score_data = {
            'point': int(game_state.score.point),
            'combo': int(game_state.score.combo),
            'level': int(game_state.score.level)
        }
        
        # ゲーム状態データ
        game_data = {
            'is_gameover': bool(game_state.is_gameover),
            'paused': bool(game_state.paused),
            'frame_count': self.frame_count
        }
        
        return {
            'canvas_id': self.canvas_id,
            'width': self.width,
            'height': self.height,
            'balls': balls_data,
            'racket': racket_data,
            'score': score_data,
            'game_state': game_data,
            'timestamp': self.frame_count
        }
    
    def _rgb_to_css_color(self, rgb_tuple) -> str:
        """RGB tupleをCSS color文字列に変換"""
        if isinstance(rgb_tuple, tuple) and len(rgb_tuple) == 3:
            r, g, b = rgb_tuple
            return f"rgb({int(r)}, {int(g)}, {int(b)})"
        else:
            return "rgb(255, 0, 0)"  # デフォルト赤色

# === profiler.memory_profiler モジュール ===
"""
メモリ使用量プロファイラー
Phase 3A: メモリ使用量プロファイリング

主な機能:
1. リアルタイムメモリ監視
2. オブジェクト追跡
3. メモリリーク検出
4. GCパフォーマンス分析
5. メモリ使用レポート生成
"""


class MemoryProfiler:
    """メモリ使用量の詳細プロファイリング"""
    
    def __init__(self):
        self.enabled = False
        self.snapshots = []
        self.object_tracker = ObjectTracker()
        self.gc_stats = GCAnalyzer()
        self.memory_pools = {}
        self.peak_usage = 0
        self.start_time = None
        
    def start(self):
        """プロファイリング開始"""
        if self.enabled:
            return
            
        self.enabled = True
        self.start_time = time.time()
        
        # トレースマロックを開始
        tracemalloc.start()
        
        # GC統計を有効化
        gc.set_debug(gc.DEBUG_STATS)
        
        # 初期スナップショット
        self._take_snapshot("initial")
        
    def stop(self):
        """プロファイリング停止"""
        if not self.enabled:
            return
            
        self.enabled = False
        
        # 最終スナップショット
        self._take_snapshot("final")
        
        # トレースマロックを停止
        tracemalloc.stop()
        
        # GCデバッグを無効化
        gc.set_debug(0)
        
    def _take_snapshot(self, label: str):
        """メモリスナップショットを取得"""
        if not self.enabled:
            return
            
        snapshot = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()
        
        # ピーク使用量を更新
        self.peak_usage = max(self.peak_usage, peak)
        
        # スナップショット情報を保存
        self.snapshots.append({
            'label': label,
            'timestamp': time.time() - self.start_time,
            'current_mb': current / 1024 / 1024,
            'peak_mb': peak / 1024 / 1024,
            'snapshot': snapshot,
            'gc_count': gc.get_count(),
            'object_count': len(gc.get_objects())
        })
        
    def analyze_memory_usage(self) -> Dict:
        """メモリ使用量の詳細分析"""
        if len(self.snapshots) < 2:
            return {'error': 'Not enough snapshots for analysis'}
            
        initial = self.snapshots[0]
        final = self.snapshots[-1]
        
        # メモリ増加量
        memory_growth = final['current_mb'] - initial['current_mb']
        
        # トップメモリ使用統計
        top_stats = self._get_top_memory_users(final['snapshot'])
        
        # メモリリーク候補
        potential_leaks = self._detect_potential_leaks()
        
        # GC分析
        gc_analysis = self.gc_stats.analyze()
        
        return {
            'summary': {
                'initial_mb': initial['current_mb'],
                'final_mb': final['current_mb'],
                'peak_mb': self.peak_usage / 1024 / 1024,
                'growth_mb': memory_growth,
                'duration_sec': final['timestamp'],
                'snapshots_count': len(self.snapshots)
            },
            'top_memory_users': top_stats,
            'potential_leaks': potential_leaks,
            'gc_analysis': gc_analysis,
            'object_tracking': self.object_tracker.get_report()
        }
        
    def _get_top_memory_users(self, snapshot, limit: int = 10) -> List[Dict]:
        """メモリ使用量トップのコード位置を取得"""
        top_stats = snapshot.statistics('lineno')[:limit]
        
        return [{
            'filename': stat.traceback.format()[0] if stat.traceback else 'Unknown',
            'size_mb': stat.size / 1024 / 1024,
            'count': stat.count,
            'average_size': stat.size / stat.count if stat.count > 0 else 0
        } for stat in top_stats]
        
    def _detect_potential_leaks(self) -> List[Dict]:
        """潜在的なメモリリークを検出"""
        if len(self.snapshots) < 3:
            return []
            
        leaks = []
        
        # 連続的にメモリが増加しているパターンを検出
        for i in range(1, len(self.snapshots) - 1):
            prev = self.snapshots[i-1]
            curr = self.snapshots[i]
            next = self.snapshots[i+1]
            
            # 単調増加をチェック
            if prev['current_mb'] < curr['current_mb'] < next['current_mb']:
                growth_rate = (next['current_mb'] - prev['current_mb']) / (next['timestamp'] - prev['timestamp'])
                
                if growth_rate > 0.1:  # 0.1MB/秒以上の増加
                    leaks.append({
                        'period': f"{prev['label']} -> {next['label']}",
                        'growth_rate_mb_per_sec': growth_rate,
                        'total_growth_mb': next['current_mb'] - prev['current_mb']
                    })
                    
        return leaks
        
    def profile_function(self, func, *args, **kwargs):
        """特定の関数のメモリ使用量をプロファイル"""
        self._take_snapshot(f"before_{func.__name__}")
        
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        
        self._take_snapshot(f"after_{func.__name__}")
        
        # 関数実行前後の差分を計算
        before = self.snapshots[-2]
        after = self.snapshots[-1]
        
        return {
            'result': result,
            'memory_used_mb': after['current_mb'] - before['current_mb'],
            'execution_time': end_time - start_time,
            'gc_collections': sum(after['gc_count']) - sum(before['gc_count'])
        }


class ObjectTracker:
    """オブジェクトの生成と破棄を追跡"""
    
    def __init__(self):
        self.tracked_types = {}
        self.weak_refs = defaultdict(list)
        
    def track_type(self, type_name: str, cls):
        """特定のクラスのインスタンスを追跡"""
        self.tracked_types[type_name] = cls
        
        # 既存のインスタンスを追跡
        for obj in gc.get_objects():
            if isinstance(obj, cls):
                try:
                    ref = weakref.ref(obj, self._on_object_deleted)
                    self.weak_refs[type_name].append(ref)
                except TypeError:
                    pass  # 弱参照をサポートしないオブジェクト
                    
    def _on_object_deleted(self, ref):
        """オブジェクトが削除されたときのコールバック"""
        # 削除されたオブジェクトの参照をクリーンアップ
        for type_name, refs in self.weak_refs.items():
            if ref in refs:
                refs.remove(ref)
                
    def get_object_counts(self) -> Dict[str, int]:
        """各タイプの生存オブジェクト数を取得"""
        counts = {}
        
        for type_name, refs in self.weak_refs.items():
            # 生存しているオブジェクトのみカウント
            alive_refs = [ref for ref in refs if ref() is not None]
            counts[type_name] = len(alive_refs)
            
            # デッドリファレンスをクリーンアップ
            self.weak_refs[type_name] = alive_refs
            
        return counts
        
    def get_report(self) -> Dict:
        """オブジェクト追跡レポート"""
        return {
            'tracked_types': list(self.tracked_types.keys()),
            'object_counts': self.get_object_counts(),
            'total_tracked': sum(self.get_object_counts().values())
        }


class GCAnalyzer:
    """ガベージコレクション分析"""
    
    def __init__(self):
        self.gc_events = []
        self.start_stats = gc.get_stats()
        
    def record_gc_event(self):
        """GCイベントを記録"""
        self.gc_events.append({
            'timestamp': time.time(),
            'count': gc.get_count(),
            'stats': gc.get_stats()
        })
        
    def analyze(self) -> Dict:
        """GCパフォーマンスを分析"""
        current_stats = gc.get_stats()
        
        # 各世代の統計を分析
        generation_analysis = []
        for i, (start, current) in enumerate(zip(self.start_stats, current_stats)):
            collections = current.get('collections', 0) - start.get('collections', 0)
            collected = current.get('collected', 0) - start.get('collected', 0)
            uncollectable = current.get('uncollectable', 0) - start.get('uncollectable', 0)
            
            generation_analysis.append({
                'generation': i,
                'collections': collections,
                'collected_objects': collected,
                'uncollectable_objects': uncollectable,
                'efficiency': collected / collections if collections > 0 else 0
            })
            
        return {
            'total_collections': sum(g['collections'] for g in generation_analysis),
            'total_collected': sum(g['collected_objects'] for g in generation_analysis),
            'generations': generation_analysis,
            'current_counts': gc.get_count(),
            'threshold': gc.get_threshold()
        }


class MemoryPool:
    """メモリプールの効果測定"""
    
    def __init__(self, object_type, initial_size: int = 10):
        self.object_type = object_type
        self.pool = []
        self.in_use = []
        self.stats = {
            'allocations': 0,
            'reuses': 0,
            'expansions': 0,
            'peak_size': initial_size
        }
        
        # 初期プールを作成
        self._expand_pool(initial_size)
        
    def _expand_pool(self, size: int):
        """プールを拡張"""
        for _ in range(size):
            self.pool.append(self.object_type())
        self.stats['expansions'] += 1
        self.stats['peak_size'] = max(self.stats['peak_size'], len(self.pool) + len(self.in_use))
        
    def acquire(self):
        """オブジェクトを取得"""
        if not self.pool:
            self._expand_pool(10)
            
        obj = self.pool.pop()
        self.in_use.append(obj)
        
        if len(self.in_use) == 1:
            self.stats['allocations'] += 1
        else:
            self.stats['reuses'] += 1
            
        return obj
        
    def release(self, obj):
        """オブジェクトを返却"""
        if obj in self.in_use:
            self.in_use.remove(obj)
            self.pool.append(obj)
            
    def get_stats(self) -> Dict:
        """プール統計を取得"""
        return {
            **self.stats,
            'current_pool_size': len(self.pool),
            'in_use_count': len(self.in_use),
            'reuse_rate': self.stats['reuses'] / (self.stats['allocations'] + self.stats['reuses']) if (self.stats['allocations'] + self.stats['reuses']) > 0 else 0
        }


def create_memory_report(profiler: MemoryProfiler) -> str:
    """詳細なメモリレポートを生成"""
    analysis = profiler.analyze_memory_usage()
    
    report = f"""
# メモリ使用量プロファイリングレポート

## サマリー
- 初期メモリ: {analysis['summary']['initial_mb']:.2f} MB
- 最終メモリ: {analysis['summary']['final_mb']:.2f} MB
- ピーク使用量: {analysis['summary']['peak_mb']:.2f} MB
- メモリ増加: {analysis['summary']['growth_mb']:.2f} MB
- 測定時間: {analysis['summary']['duration_sec']:.2f} 秒

## トップメモリ使用
"""
    
    for i, user in enumerate(analysis['top_memory_users'][:5], 1):
        report += f"{i}. {user['filename']}\n"
        report += f"   - サイズ: {user['size_mb']:.2f} MB\n"
        report += f"   - オブジェクト数: {user['count']}\n"
        
    if analysis['potential_leaks']:
        report += "\n## 潜在的なメモリリーク\n"
        for leak in analysis['potential_leaks']:
            report += f"- {leak['period']}: {leak['growth_rate_mb_per_sec']:.3f} MB/秒\n"
    else:
        report += "\n## メモリリーク: 検出されず ✅\n"
        
    report += f"\n## ガベージコレクション分析\n"
    report += f"- 総コレクション数: {analysis['gc_analysis']['total_collections']}\n"
    report += f"- 回収オブジェクト数: {analysis['gc_analysis']['total_collected']}\n"
    
    return report

# === エントリーポイント ===
def create_optimized_game():
    """Pyodide最適化ゲームインスタンス作成"""
    game_state = PygameGameState()
    game_view = PygameGameView(screen=None)
    return PygameGameController(game_state, game_view)

# グローバルアクセス用
game_instance = None

def init_game():
    global game_instance
    game_instance = create_optimized_game()
    return game_instance