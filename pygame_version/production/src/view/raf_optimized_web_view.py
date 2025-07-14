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
import json
import time
from typing import Dict, List, Optional, Tuple, Any
from ..model.pygame_game_state import PygameGameState, PygameGameStateObserver
class RAFOptimizedWebCanvasView(PygameGameStateObserver):
    """RequestAnimationFrame最適化されたCanvas描画ビュー"""
    def __init__(self, canvas_id: str = "gameCanvas"):
        self.canvas_id = canvas_id
        self.canvas_width = 640
        self.canvas_height = 480
        self.target_fps = 60
        self.frame_time_budget = 1000 / self.target_fps
        self.adaptive_quality = True
        self.vsync_enabled = True
        self.last_frame_time = 0
        self.frame_delta = 0
        self.accumulated_time = 0
        self.frame_count = 0
        self.skipped_frames = 0
        self.quality_level = 3
        self.auto_quality_adjustment = True
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
        self.batch_commands = []
        self.static_cache = None
        self.dynamic_elements = []
        self.dirty_regions = []
        self.draw_budget_ms = 10
        self.update_budget_ms = 5
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
            self.frame_delta = delta_time
            self.accumulated_time += delta_time
            self.frame_count += 1
            if self.accumulated_time >= 1.0:
                self.performance_stats['fps'] = self.frame_count / self.accumulated_time
                self.frame_count = 0
                self.accumulated_time = 0
            if self.auto_quality_adjustment:
                self._adjust_quality_level()
            if self._should_skip_frame():
                self.skipped_frames += 1
                self.performance_stats['skipped_frames'] = self.skipped_frames
                return json.dumps({
                    'skip': True,
                    'reason': 'performance_optimization'
                })
            commands = self._generate_raf_optimized_commands(frame_data)
            end_time = time.perf_counter()
            frame_time = (end_time - start_time) * 1000
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
        if self.performance_stats.get('frame_time', 0) > self.frame_time_budget * 1.5:
            return True
        current_fps = self.performance_stats.get('fps', self.target_fps)
        if current_fps < self.target_fps * 0.5 and current_fps > 0:
            return self.frame_count % 2 == 0
        return False
    def _adjust_quality_level(self):
        """品質レベルの動的調整"""
        if not self.auto_quality_adjustment:
            return
        fps = self.performance_stats.get('fps', self.target_fps)
        frame_time = self.performance_stats.get('frame_time', 0)
        if fps < self.target_fps * 0.8 or frame_time > self.frame_time_budget * 1.2:
            if self.quality_level > 0:
                self.quality_level -= 1
                self.performance_stats['adaptive_actions'].append({
                    'action': 'quality_decreased',
                    'new_level': self.quality_level,
                    'reason': f'Low FPS: {fps:.1f}'
                })
        elif fps > self.target_fps * 0.95 and frame_time < self.frame_time_budget * 0.7:
            if self.quality_level < 3:
                self.quality_level += 1
                self.performance_stats['adaptive_actions'].append({
                    'action': 'quality_increased',
                    'new_level': self.quality_level,
                    'reason': f'Good performance: {fps:.1f} FPS'
                })
        self.performance_stats['quality_level'] = self.quality_level
    def _generate_raf_optimized_commands(self, frame_data: Dict) -> List[Dict]:
        """RequestAnimationFrame最適化された描画コマンド生成"""
        commands = []
        if self.quality_level == 0:
            commands.extend(self._generate_minimal_commands(frame_data))
        elif self.quality_level == 1:
            commands.extend(self._generate_low_quality_commands(frame_data))
        elif self.quality_level == 2:
            commands.extend(self._generate_medium_quality_commands(frame_data))
        else:
            commands.extend(self._generate_high_quality_commands(frame_data))
        if len(commands) > 10:
            commands = self._batch_similar_commands(commands)
        return commands
    def _generate_minimal_commands(self, frame_data: Dict) -> List[Dict]:
        """最小限の描画コマンド（低負荷）"""
        commands = []
        commands.append({
            'type': 'fillRect',
            'x': 0, 'y': 0,
            'width': self.canvas_width,
            'height': self.canvas_height,
            'color': '#000'
        })
        for ball in frame_data.get('balls', []):
            commands.append({
                'type': 'fillCircle',
                'x': ball['x'],
                'y': ball['y'],
                'radius': ball['radius'],
                'color': '#fff'
            })
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
        for ball in frame_data.get('balls', []):
            if 'trail' in ball and len(ball['trail']) > 0:
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
        commands.append({
            'type': 'gradient',
            'x1': 0, 'y1': 0,
            'x2': 0, 'y2': self.canvas_height,
            'colors': ['#000428', '#004e92'],
            'rect': [0, 0, self.canvas_width, self.canvas_height]
        })
        commands.append({
            'type': 'grid',
            'spacing': 20,
            'color': 'rgba(255,255,255,0.05)'
        })
        commands.extend(self._generate_game_elements_medium(frame_data))
        return commands
    def _generate_high_quality_commands(self, frame_data: Dict) -> List[Dict]:
        """高品質描画コマンド（フルエフェクト）"""
        commands = []
        commands.extend(self._generate_premium_background())
        if 'particles' in frame_data:
            commands.extend(self._generate_particle_effects(frame_data['particles']))
        commands.extend(self._generate_game_elements_high(frame_data))
        commands.extend(self._generate_post_effects(frame_data))
        return commands
    def _batch_similar_commands(self, commands: List[Dict]) -> List[Dict]:
        """類似コマンドのバッチ処理"""
        batched = []
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
        for ball in frame_data.get('balls', []):
            commands.append({
                'type': 'shadow',
                'blur': 10,
                'color': 'rgba(0,0,0,0.5)',
                'offsetX': 2,
                'offsetY': 2
            })
            commands.append({
                'type': 'fillCircle',
                'x': ball['x'],
                'y': ball['y'],
                'radius': ball['radius'],
                'color': '#fff'
            })
            if 'trail' in ball:
                for i, pos in enumerate(ball['trail'][-5:]):
                    commands.append({
                        'type': 'fillCircle',
                        'x': pos[0],
                        'y': pos[1],
                        'radius': ball['radius'] * (0.7 - i * 0.1),
                        'color': f'rgba(255,255,255,{0.3 - i * 0.05})'
                    })
        for racket in frame_data.get('rackets', []):
            commands.append({
                'type': 'glow',
                'x': racket['x'],
                'y': racket['y'],
                'width': racket['width'],
                'height': racket['height'],
                'color': '#0f0',
                'blur': 15
            })
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
        commands.extend(self._generate_game_elements_medium(frame_data))
        for ball in frame_data.get('balls', []):
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
        for particle in particles[:50]:
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
        if frame_data.get('score_changed'):
            commands.append({
                'type': 'flash',
                'color': 'rgba(255,255,255,0.3)',
                'duration': 100
            })
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
        self.frame_data = self._convert_game_state_to_frame_data(game_state)
        delta_time = 0.016
        result = self.prepare_frame(self.frame_data, delta_time)
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
        balls_data = []
        for ball in game_state.balls:
            balls_data.append({
                'x': ball.x,
                'y': ball.y,
                'radius': ball.radius,
                'trail': []
            })
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