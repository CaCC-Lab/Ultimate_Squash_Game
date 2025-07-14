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
import json
from typing import Dict, Any, List, Optional
from model.pygame_game_state import PygameGameState, PygameGameStateObserver
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
        self.current_frame_data = {}
        self.frame_count = 0
        self.draw_commands = []
        self.last_error = None
        print(f"WebCanvasView初期化完了: {canvas_id} ({width}x{height})")
    def on_game_state_changed(self, game_state: PygameGameState):
        """
        ゲーム状態変更通知（Observerパターン）
        Args:
            game_state: PygameGameState - 変更されたゲーム状態
        """
        try:
            frame_data = self._convert_game_state_to_canvas_data(game_state)
            draw_commands = self._generate_draw_commands(frame_data)
            self.current_frame_data = frame_data
            self.draw_commands = draw_commands
            self.frame_count += 1
        except Exception as e:
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
        racket_data = None
        if game_state.racket:
            racket_data = {
                'x': float(game_state.racket.x),
                'y': float(game_state.racket.y),
                'width': float(game_state.racket.size),
                'height': float(game_state.racket.height),
                'color': self._rgb_to_css_color(game_state.racket.color)
            }
        score_data = {
            'point': int(game_state.score.point),
            'combo': int(game_state.score.combo),
            'level': int(game_state.score.level)
        }
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
            return "rgb(255, 0, 0)"
    def _generate_draw_commands(self, frame_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Canvas描画コマンド生成
        Args:
            frame_data: Dict[str, Any] - フレームデータ
        Returns:
            List[Dict[str, Any]]: 描画コマンドリスト
        """
        commands = []
        commands.append({
            'command': 'clear',
            'color': 'rgb(240, 240, 240)'
        })
        for ball in frame_data['balls']:
            commands.append({
                'command': 'draw_circle',
                'x': ball['x'],
                'y': ball['y'],
                'radius': ball['radius'],
                'color': ball['color']
            })
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
        sound_command = {
            'command': 'play_sound',
            'type': sound_type,
            'timestamp': len(self.sound_commands),
            'enabled': self.sound_enabled
        }
        self.sound_commands.append(sound_command)
        if self.sound_enabled:
            print(f"サウンド再生コマンド: {sound_type}")
        else:
            print(f"サウンドコマンド（無音モード）: {sound_type}")
    def get_sound_commands_json(self) -> str:
        """サウンドコマンドをJSON形式で取得"""
        try:
            commands_json = json.dumps(self.sound_commands, ensure_ascii=False)
            self.sound_commands = []
            return commands_json
        except Exception as e:
            print(f"サウンドコマンド変換エラー: {str(e)}")
            return "[]"