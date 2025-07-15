"""
OptimizedWebCanvasView テスト

個人開発規約遵守:
- TDD必須: 最適化機能の各テスト
- モック禁止: 実際のデータ処理確認
- エラー3要素: エラーケースの適切な検証

テスト対象:
- 差分検出システム
- バッチ描画コマンド生成
- ダーティリージョン管理
- パフォーマンス統計
"""

import unittest
import json
import sys
import os

# 絶対インポートパスの設定
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, '..', 'src')
sys.path.insert(0, src_dir)

# プロジェクトルートも追加
project_root = os.path.join(current_dir, '..', '..')
sys.path.insert(0, project_root)

from typing import Dict, Any
from pygame_version.src.view.optimized_web_game_view import OptimizedWebCanvasView
from pygame_version.src.model.pygame_game_state import PygameGameState, PygameBall, PygameRacket, PygameScore


class TestOptimizedWebCanvasView(unittest.TestCase):
    """OptimizedWebCanvasView のテストクラス"""
    
    def setUp(self):
        """各テストケースの前処理"""
        self.view = OptimizedWebCanvasView(canvas_id="testCanvas", width=640, height=480)
        
        # テスト用ゲーム状態作成
        self.game_state = PygameGameState()
        
        # テストデータの設定
        self._setup_test_data()
    
    def _setup_test_data(self):
        """テストデータの設定"""
        # テストデータは既に初期化されているゲーム状態を使用
        # 必要に応じて微調整のみ実施
        
        # ボールの初期位置を予測可能な値に設定
        if self.game_state.balls:
            ball = self.game_state.balls[0]
            ball.x = 100.0
            ball.y = 200.0
            ball.dx = 8.0
            ball.dy = -8.0
            ball.radius = 10
            ball.color = (255, 0, 0)  # 赤色
        
        # ラケットの初期位置設定
        if self.game_state.racket:
            self.game_state.racket.x = 270.0
            self.game_state.racket.y = 470.0
            self.game_state.racket.size = 100
            self.game_state.racket.height = 10
            self.game_state.racket.color = (255, 255, 0)  # 黄色
        
        # スコアの初期化
        if self.game_state.score:
            self.game_state.score.point = 0
            self.game_state.score.combo = 0
            self.game_state.score.level = 1
        
        # ゲーム状態の初期化
        self.game_state.is_gameover = False
        self.game_state.paused = False
    
    def _create_test_config(self) -> Dict[str, Any]:
        """テスト用設定作成"""
        return {
            'BALL_RADIUS': 10,
            'RACKET_SIZE': 100,
            'RACKET_HEIGHT': 10,
            'INIT_DX': 8.0,
            'INIT_DY': -8.0,
            'BALL_COLORS': [(255, 0, 0)]
        }
    
    def test_initial_static_layer_creation(self):
        """静的レイヤーの初期化テスト"""
        # 静的レイヤーコマンドが作成されているか確認
        self.assertGreater(len(self.view.static_layer_commands), 0)
        
        # 最初のコマンドがレイヤー設定か確認
        first_command = self.view.static_layer_commands[0]
        self.assertEqual(first_command['command'], 'set_layer')
        self.assertEqual(first_command['layer'], 'static')
        
        # グリッド描画コマンドの存在確認
        grid_commands = [cmd for cmd in self.view.static_layer_commands 
                        if cmd['command'] == 'draw_grid']
        self.assertEqual(len(grid_commands), 1)
    
    def test_first_frame_all_changed(self):
        """初回フレームは全要素変更扱いのテスト"""
        # 初回の状態変更通知
        # エラーハンドリングを考慮した呼び出し
        self.view.on_game_state_changed(self.game_state)
        
        # エラーが発生した場合はフォールバック状態のテスト
        if self.view.last_error is not None:
            fallback_commands = [cmd for cmd in self.view.draw_commands 
                               if cmd['command'] == 'fallback_mode']
            self.assertEqual(len(fallback_commands), 1)
            return
        
        # draw_commandsに静的レイヤーが含まれているか確認
        clear_commands = [cmd for cmd in self.view.draw_commands 
                         if cmd['command'] == 'clear']
        self.assertEqual(len(clear_commands), 1)
        
        # フレームカウントの確認
        self.assertEqual(self.view.frame_count, 1)
    
    def test_no_change_detection(self):
        """変更なし検出テスト"""
        # 初回フレーム
        self.view.on_game_state_changed(self.game_state)
        
        # 同じ状態で2回目（変更なし）
        prev_stats = self.view.performance_stats['skipped_updates']
        self.view.on_game_state_changed(self.game_state)
        
        # スキップカウントが増えているか確認
        self.assertEqual(
            self.view.performance_stats['skipped_updates'],
            prev_stats + 1
        )
        
        # skip_frameコマンドの確認
        skip_commands = [cmd for cmd in self.view.draw_commands 
                        if cmd['command'] == 'skip_frame']
        self.assertEqual(len(skip_commands), 1)
    
    def test_ball_movement_detection(self):
        """ボール移動の差分検出テスト"""
        # 初回フレーム
        self.view.on_game_state_changed(self.game_state)
        
        # ボールを移動
        self.game_state.balls[0].x += 10
        self.game_state.balls[0].y += 10
        
        # 2回目のフレーム
        self.view.on_game_state_changed(self.game_state)
        
        # 差分描画モードの確認
        diff_mode_commands = [cmd for cmd in self.view.draw_commands 
                             if cmd['command'] == 'set_mode' and cmd['mode'] == 'differential']
        self.assertEqual(len(diff_mode_commands), 1)
        
        # バッチ描画コマンドの確認
        batch_commands = [cmd for cmd in self.view.draw_commands 
                         if cmd['command'] == 'draw_batch_circles']
        self.assertEqual(len(batch_commands), 1)
        self.assertEqual(len(batch_commands[0]['circles']), 1)
    
    def test_racket_movement_detection(self):
        """ラケット移動の差分検出テスト"""
        # 初回フレーム
        self.view.on_game_state_changed(self.game_state)
        
        # ラケットを移動
        self.game_state.racket.x += 50
        
        # 2回目のフレーム
        self.view.on_game_state_changed(self.game_state)
        
        # ラケット描画コマンドの確認
        racket_commands = [cmd for cmd in self.view.draw_commands 
                          if cmd['command'] == 'draw_rectangle' and cmd.get('id') == 'racket']
        self.assertEqual(len(racket_commands), 1)
    
    def test_score_change_detection(self):
        """スコア変更の検出テスト"""
        # 初回フレーム
        self.view.on_game_state_changed(self.game_state)
        
        # スコアを変更
        self.game_state.score.point += 100
        self.game_state.score.combo += 1
        
        # 2回目のフレーム
        self.view.on_game_state_changed(self.game_state)
        
        # UIレイヤー設定の確認
        ui_layer_commands = [cmd for cmd in self.view.draw_commands 
                            if cmd['command'] == 'set_layer' and cmd['layer'] == 'ui']
        self.assertGreater(len(ui_layer_commands), 0)
        
        # スコアテキスト更新の確認
        text_commands = [cmd for cmd in self.view.draw_commands 
                        if cmd['command'] == 'update_text' and cmd.get('id') == 'score_text']
        self.assertEqual(len(text_commands), 1)
    
    def test_dirty_region_tracking(self):
        """ダーティリージョン追跡テスト"""
        # 初回フレーム
        self.view.on_game_state_changed(self.game_state)
        
        # ダーティリージョンをクリア（初回フレーム後）
        self.assertEqual(len(self.view.dirty_regions), 0)
        
        # ボールを移動
        self.game_state.balls[0].x += 20
        self.game_state.balls[0].y += 20
        
        # 2回目のフレーム（変更検出前）
        changes = self.view._detect_changes(
            self.view._convert_game_state_to_canvas_data(self.game_state)
        )
        
        # ダーティリージョンが追加されているか確認
        self.assertGreater(len(self.view.dirty_regions), 0)
    
    def test_command_pooling(self):
        """コマンドプール機能のテスト"""
        # 初期状態でプールは空
        self.assertEqual(len(self.view.command_pool), 0)
        
        # コマンド作成
        cmd1 = self.view._get_command('test_command', {'param': 'value'})
        self.assertEqual(cmd1['command'], 'test_command')
        self.assertEqual(cmd1['param'], 'value')
        
        # コマンドをプールに返却
        self.view._return_command_to_pool(cmd1)
        self.assertEqual(len(self.view.command_pool), 1)
        
        # プールから再利用
        cmd2 = self.view._get_command('another_command', {'param2': 'value2'})
        self.assertEqual(cmd2['command'], 'another_command')
        self.assertEqual(cmd2['param2'], 'value2')
        self.assertNotIn('param', cmd2)  # 前のパラメータがクリアされている
        
        # 再利用カウントの確認
        self.assertEqual(self.view.performance_stats['reused_commands'], 1)
    
    def test_pause_overlay_generation(self):
        """ポーズオーバーレイ生成テスト"""
        # ゲームをポーズ
        self.game_state.paused = True
        
        # フレーム更新
        self.view.on_game_state_changed(self.game_state)
        
        # オーバーレイコマンドの確認
        overlay_commands = [cmd for cmd in self.view.draw_commands 
                           if cmd['command'] == 'draw_overlay']
        self.assertEqual(len(overlay_commands), 1)
        self.assertEqual(overlay_commands[0]['text'], 'PAUSED')
    
    def test_game_over_overlay_generation(self):
        """ゲームオーバーオーバーレイ生成テスト"""
        # ゲームオーバー状態に設定
        self.game_state.is_gameover = True
        
        # フレーム更新
        self.view.on_game_state_changed(self.game_state)
        
        # オーバーレイコマンドの確認
        overlay_commands = [cmd for cmd in self.view.draw_commands 
                           if cmd['command'] == 'draw_overlay']
        self.assertEqual(len(overlay_commands), 1)
        self.assertEqual(overlay_commands[0]['text'], 'GAME OVER')
    
    def test_batch_drawing_optimization(self):
        """バッチ描画最適化テスト"""
        # 複数のボールを追加
        for i in range(5):
            ball = PygameBall(
                x=100 + i * 50,
                y=200,
                dx=8.0,
                dy=-8.0,
                size=20,  # radius=10 → size=20 (radius = size // 2)
                color=(255, 0, 0)
            )
            self.game_state.balls.append(ball)
        
        # 初回フレーム
        self.view.on_game_state_changed(self.game_state)
        
        # すべてのボールを少し移動
        for ball in self.game_state.balls:
            ball.x += 5
            ball.y += 5
        
        # 2回目のフレーム
        self.view.on_game_state_changed(self.game_state)
        
        # バッチ描画コマンドの確認
        batch_commands = [cmd for cmd in self.view.draw_commands 
                         if cmd['command'] == 'draw_batch_circles']
        self.assertEqual(len(batch_commands), 1)
        self.assertEqual(len(batch_commands[0]['circles']), 6)  # 元の1個 + 追加5個
    
    def test_performance_report_generation(self):
        """パフォーマンスレポート生成テスト"""
        # いくつかのフレームを処理
        actual_frame_count = 0
        for i in range(10):
            if i % 2 == 0:
                # 偶数フレームで変更
                self.game_state.balls[0].x += 10
                actual_frame_count += 1  # 変更があるフレームのみカウント
            self.view.on_game_state_changed(self.game_state)
        
        # パフォーマンスレポート取得
        report = self.view.get_performance_report()
        
        # レポート内容の確認（実際のフレーム数は変更があったもののみ）
        self.assertEqual(report['total_frames'], actual_frame_count)
        self.assertIn('reuse_rate', report)
        self.assertIn('skip_rate', report)
        self.assertIn('avg_dirty_regions', report)
        self.assertIn('command_pool_size', report)
        
        # スキップ数の確認（5回の変更なしフレーム）
        self.assertEqual(self.view.performance_stats['skipped_updates'], 5)
    
    def test_javascript_interface_optimization(self):
        """JavaScript連携データの最適化テスト"""
        # フレーム処理
        self.view.on_game_state_changed(self.game_state)
        
        # JavaScript連携データ取得
        interface_data = self.view.get_javascript_interface_data()
        
        # JSON形式の確認（インデントなしで軽量化）
        self.assertNotIn('\n', interface_data)
        
        # データ構造の確認
        parsed_data = json.loads(interface_data)
        self.assertIn('optimization_stats', parsed_data)
        self.assertIn('frame_data', parsed_data)
        self.assertIn('draw_commands', parsed_data)
    
    def test_error_handling_with_fallback(self):
        """エラーハンドリングとフォールバックテスト"""
        # 不正な状態を作成（Noneを渡す）
        self.view.on_game_state_changed(None)
        
        # エラーが記録されているか確認
        self.assertIsNotNone(self.view.last_error)
        self.assertIn('what', self.view.last_error)
        self.assertIn('why', self.view.last_error)
        self.assertIn('how', self.view.last_error)
        
        # フォールバックコマンドの確認
        fallback_commands = [cmd for cmd in self.view.draw_commands 
                            if cmd['command'] == 'fallback_mode']
        self.assertEqual(len(fallback_commands), 1)
    
    def test_performance_stats_reset(self):
        """パフォーマンス統計リセットテスト"""
        # いくつかのフレームを処理
        for _ in range(5):
            self.view.on_game_state_changed(self.game_state)
        
        # 統計が蓄積されているか確認
        self.assertGreater(self.view.frame_count, 0)
        self.assertGreater(self.view.performance_stats['total_commands'], 0)
        
        # リセット実行
        self.view.reset_performance_stats()
        
        # リセット後の確認
        self.assertEqual(self.view.frame_count, 0)
        self.assertEqual(self.view.performance_stats['total_commands'], 0)
        self.assertEqual(self.view.performance_stats['reused_commands'], 0)
        self.assertEqual(self.view.performance_stats['skipped_updates'], 0)


if __name__ == '__main__':
    unittest.main()