"""
RequestAnimationFrame最適化のテストスイート
"""
import pytest
import json
import time
from src.view.raf_optimized_web_view import RAFOptimizedWebCanvasView


class TestRAFOptimization:
    """RequestAnimationFrame最適化のテスト"""
    
    def setup_method(self):
        """各テストメソッドの前に実行"""
        self.view = RAFOptimizedWebCanvasView()
        self.sample_frame_data = {
            'balls': [
                {'x': 320, 'y': 240, 'radius': 10, 'dx': 5, 'dy': 3}
            ],
            'rackets': [
                {'x': 50, 'y': 200, 'width': 10, 'height': 80, 'color': '#0f0'},
                {'x': 580, 'y': 200, 'width': 10, 'height': 80, 'color': '#f00'}
            ]
        }
    
    def test_initialization(self):
        """初期化テスト"""
        assert self.view.canvas_id == "gameCanvas"
        assert self.view.canvas_width == 640
        assert self.view.canvas_height == 480
        assert self.view.target_fps == 60
        assert self.view.quality_level == 3
        assert self.view.adaptive_quality == True
        assert self.view.vsync_enabled == True
    
    def test_frame_preparation(self):
        """フレーム準備の基本テスト"""
        result_json = self.view.prepare_frame(self.sample_frame_data, 0.016)
        result = json.loads(result_json)
        
        assert 'commands' in result
        assert 'stats' in result
        assert 'quality' in result
        assert 'vsync' in result
        assert len(result['commands']) > 0
    
    def test_frame_skip_logic(self):
        """フレームスキップロジックのテスト"""
        # 前フレームが重い場合をシミュレート
        self.view.performance_stats['frame_time'] = 30  # 30ms (重い)
        
        should_skip = self.view._should_skip_frame()
        assert should_skip == True
        
        # 通常の場合
        self.view.performance_stats['frame_time'] = 10  # 10ms (通常)
        should_skip = self.view._should_skip_frame()
        assert should_skip == False
    
    def test_quality_adjustment(self):
        """品質レベル自動調整のテスト"""
        # 低FPSシミュレーション
        self.view.performance_stats['fps'] = 30  # 目標の50%
        self.view.performance_stats['frame_time'] = 25  # 重い
        
        initial_quality = self.view.quality_level
        self.view._adjust_quality_level()
        
        # 品質が下がることを確認
        assert self.view.quality_level < initial_quality
        
        # 高FPSシミュレーション
        self.view.performance_stats['fps'] = 60
        self.view.performance_stats['frame_time'] = 10  # 軽い
        
        self.view._adjust_quality_level()
        # 品質が上がる可能性を確認（既に下がっているため）
        assert self.view.quality_level >= 0
    
    def test_quality_levels(self):
        """各品質レベルの描画コマンド生成テスト"""
        for quality in range(4):
            self.view.quality_level = quality
            commands = self.view._generate_raf_optimized_commands(self.sample_frame_data)
            
            assert len(commands) > 0
            
            # 品質レベルが高いほどコマンド数が多い
            if quality == 0:
                minimal_count = len(commands)
            else:
                assert len(commands) >= minimal_count
    
    def test_batch_optimization(self):
        """バッチ最適化のテスト"""
        # 多数のコマンドを生成
        commands = []
        for i in range(10):
            commands.append({
                'type': 'fillCircle',
                'x': i * 10,
                'y': i * 10,
                'radius': 5,
                'color': '#fff'
            })
        
        batched = self.view._batch_similar_commands(commands)
        
        # バッチ化されていることを確認
        assert len(batched) < len(commands)
        assert any(cmd['type'] == 'batchCircles' for cmd in batched)
    
    def test_performance_tracking(self):
        """パフォーマンストラッキングのテスト"""
        # 複数フレームを処理
        for i in range(10):
            self.view.prepare_frame(self.sample_frame_data, 0.016)
            time.sleep(0.001)  # 短い遅延
        
        stats = self.view.performance_stats
        
        assert 'fps' in stats
        assert 'frame_time' in stats
        assert 'quality_level' in stats
        assert 'frame_budget_usage' in stats
    
    def test_adaptive_quality_toggle(self):
        """適応品質の有効/無効切り替えテスト"""
        # 自動品質調整を無効化
        self.view.enable_auto_quality(False)
        assert self.view.auto_quality_adjustment == False
        
        # 手動で品質レベルを設定
        self.view.set_quality_level(1)
        assert self.view.quality_level == 1
        
        # 低FPSでも品質が変わらないことを確認
        self.view.performance_stats['fps'] = 20
        self.view._adjust_quality_level()
        assert self.view.quality_level == 1  # 変化なし
    
    def test_target_fps_setting(self):
        """目標FPS設定のテスト"""
        # 有効な範囲内
        self.view.set_target_fps(30)
        assert self.view.target_fps == 30
        assert self.view.frame_time_budget == 1000 / 30
        
        # 範囲外（下限）
        self.view.set_target_fps(10)
        assert self.view.target_fps == 15  # 最小値に制限
        
        # 範囲外（上限）
        self.view.set_target_fps(200)
        assert self.view.target_fps == 120  # 最大値に制限
    
    def test_vsync_toggle(self):
        """垂直同期の有効/無効テスト"""
        self.view.enable_vsync(False)
        assert self.view.vsync_enabled == False
        
        result_json = self.view.prepare_frame(self.sample_frame_data, 0.016)
        result = json.loads(result_json)
        assert result['vsync'] == False
    
    def test_performance_report(self):
        """パフォーマンスレポート生成テスト"""
        # いくつかのフレームを処理
        for i in range(5):
            self.view.prepare_frame(self.sample_frame_data, 0.016)
        
        report = self.view.get_performance_report()
        
        assert 'current_fps' in report
        assert 'target_fps' in report
        assert 'quality_level' in report
        assert 'frame_time_avg' in report
        assert 'frame_budget' in report
        assert 'skipped_frames' in report
        assert 'vsync_enabled' in report
        assert 'auto_quality' in report
        assert 'adaptive_history' in report
    
    def test_error_handling(self):
        """エラーハンドリングのテスト"""
        # 不正なフレームデータ
        invalid_data = {'invalid': 'data'}
        result_json = self.view.prepare_frame(invalid_data, 0.016)
        result = json.loads(result_json)
        
        # エラーでもJSONが返されることを確認
        assert 'commands' in result or 'error' in result
    
    def test_frame_budget_calculation(self):
        """フレームバジェット計算のテスト"""
        # 60 FPSの場合
        self.view.set_target_fps(60)
        assert abs(self.view.frame_time_budget - 16.67) < 0.1
        
        # 30 FPSの場合
        self.view.set_target_fps(30)
        assert abs(self.view.frame_time_budget - 33.33) < 0.1
    
    def test_particle_effects_limit(self):
        """パーティクルエフェクトの制限テスト"""
        # 大量のパーティクルを含むデータ
        frame_data = self.sample_frame_data.copy()
        frame_data['particles'] = [
            {'x': i, 'y': i, 'size': 2} for i in range(100)
        ]
        
        commands = self.view._generate_particle_effects(frame_data['particles'])
        
        # 最大50個に制限されることを確認
        particle_commands = [cmd for cmd in commands if cmd['type'] == 'particle']
        assert len(particle_commands) <= 50
    
    def test_accumulated_time_reset(self):
        """累積時間のリセットテスト"""
        # 1秒以上の累積時間をシミュレート
        self.view.accumulated_time = 1.5
        self.view.frame_count = 90
        
        self.view.prepare_frame(self.sample_frame_data, 0.016)
        
        # リセットされていることを確認
        assert self.view.accumulated_time < 1.0
        assert self.view.frame_count < 90


if __name__ == "__main__":
    pytest.main([__file__, "-v"])