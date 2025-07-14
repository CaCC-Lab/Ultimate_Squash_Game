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
import json
from typing import Dict, Any, List, Optional, Set
from ..model.pygame_game_state import PygameGameState, PygameGameStateObserver
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
        self.frame_count = 0
        self.draw_commands = []
        self.current_frame_data = {}
        self.previous_frame_data = {}
        self.static_layer_commands = []
        self.dynamic_layer_commands = []
        self.dirty_regions: Set[tuple] = set()
        self.command_pool = []
        self.max_pool_size = 100
        self.performance_stats = {
            'total_commands': 0,
            'reused_commands': 0,
            'skipped_updates': 0,
            'dirty_regions': 0
        }
        self.last_error = None
        self._initialize_static_layer()
        print(f"OptimizedWebCanvasView初期化完了: {canvas_id} ({width}x{height})")
    def _initialize_static_layer(self):
        """静的レイヤーの初期化（背景、UI要素）"""
        self.static_layer_commands.append({
            'command': 'set_layer',
            'layer': 'static'
        })
        self.static_layer_commands.append({
            'command': 'draw_grid',
            'spacing': 50,
            'color': 'rgba(200, 200, 200, 0.3)'
        })
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
            frame_data = self._convert_game_state_to_canvas_data(game_state)
            changed_elements = self._detect_changes(frame_data)
            has_changes = (changed_elements['all_changed'] or
                          len(changed_elements['balls']) > 0 or
                          changed_elements['racket'] is not None or
                          changed_elements['score'] is not None or
                          changed_elements['game_state'] is not None)
            if has_changes:
                draw_commands = self._generate_optimized_draw_commands(
                    frame_data,
                    changed_elements
                )
                self.current_frame_data = frame_data
                self.draw_commands = draw_commands
                self.frame_count += 1
                self.performance_stats['total_commands'] += len(draw_commands)
            else:
                self.performance_stats['skipped_updates'] += 1
                self.draw_commands = [{
                    'command': 'skip_frame',
                    'reason': 'no_changes'
                }]
            self.previous_frame_data = frame_data.copy()
        except Exception as e:
            error_msg = {
                'what': "最適化Canvas描画データ準備に失敗しました",
                'why': f"差分検出または最適化処理でエラーが発生: {str(e)}",
                'how': "ゲーム状態を確認し、必要に応じて通常描画モードに切り替えてください"
            }
            print(f"最適化エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            self.last_error = error_msg
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
        prev_balls = self.previous_frame_data.get('balls', [])
        curr_balls = frame_data.get('balls', [])
        for i, ball in enumerate(curr_balls):
            if i >= len(prev_balls) or self._has_ball_changed(prev_balls[i], ball):
                changes['balls'].append((i, ball))
                self._add_dirty_region(ball['x'], ball['y'], ball['radius'] * 2)
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
        prev_score = self.previous_frame_data.get('score', {})
        curr_score = frame_data.get('score', {})
        if (prev_score.get('point') != curr_score.get('point') or
            prev_score.get('combo') != curr_score.get('combo')):
            changes['score'] = curr_score
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
            radius = width / 2
            region = (int(x - radius), int(y - radius), int(width), int(width))
        else:
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
        if changes['all_changed']:
            commands.append(self._get_command('clear', {'color': 'rgb(240, 240, 240)'}))
            commands.extend(self.static_layer_commands)
        else:
            commands.append({
                'command': 'set_mode',
                'mode': 'differential',
                'regions': list(self.dirty_regions)
            })
        commands.append({
            'command': 'set_layer',
            'layer': 'dynamic'
        })
        if changes['balls']:
            ball_batch = {
                'command': 'draw_batch_circles',
                'circles': []
            }
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
                for index, ball in changes['balls']:
                    ball_batch['circles'].append({
                        'id': f'ball_{index}',
                        'x': ball['x'],
                        'y': ball['y'],
                        'radius': ball['radius'],
                        'color': ball['color']
                    })
            commands.append(ball_batch)
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
            return json.dumps(interface_data, ensure_ascii=False, indent=None)
        except Exception as e:
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
    def _convert_game_state_to_canvas_data(self, game_state: PygameGameState) -> Dict[str, Any]:
        """親クラスの実装を使用（変更なし）"""
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
        """RGB tupleをCSS color文字列に変換"""
        if isinstance(rgb_tuple, tuple) and len(rgb_tuple) == 3:
            r, g, b = rgb_tuple
            return f"rgb({int(r)}, {int(g)}, {int(b)})"
        else:
            return "rgb(255, 0, 0)"