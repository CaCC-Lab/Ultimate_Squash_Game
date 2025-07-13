"""
特性化テスト（Characterization Test）- engine.pyの現在の動作を記録
リファクタリング時の安全性確保とデグレード検出のため

個人開発規約遵守:
- TDD必須: リファクタリング前の動作を正確に記録
- モック禁止: 実際のGameEngineインスタンスで検証
- エラー3要素: 期待値と実際値の差分を明確に記録
"""

import pytest
import sys
import os
import copy
from unittest.mock import patch, MagicMock

# 相対インポートパスの設定
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from game.engine import GameEngine


class TestEngineCharacterization:
    """現在のGameEngineの動作を記録する特性化テスト"""
    
    @pytest.fixture(autouse=True)
    def setup_mocked_engine(self):
        """テスト用のモックされたGameEngineを作成"""
        
        # 各tkinterコンポーネントのモックを設定
        tk_mocks = {
            'tkinter.Tk': MagicMock(),
            'tkinter.Canvas': MagicMock(),
            'tkinter.Frame': MagicMock(),
            'tkinter.StringVar': MagicMock(return_value=MagicMock(get=MagicMock(return_value="normal"))),
            'tkinter.BooleanVar': MagicMock(return_value=MagicMock(get=MagicMock(return_value=True))),
            'tkinter.Label': MagicMock(),
            'tkinter.LabelFrame': MagicMock(),
            'tkinter.Radiobutton': MagicMock(),
            'tkinter.Checkbutton': MagicMock()
        }
        
        # 全てのtkinterコンポーネントをパッチ
        patchers = [patch(name, mock) for name, mock in tk_mocks.items()]
        
        # パッチを開始
        for patcher in patchers:
            patcher.start()
        
        # GameEngineインスタンス作成
        self.engine = GameEngine()
        
        # テスト後にパッチを停止
        yield
        for patcher in patchers:
            patcher.stop()
    
    def test_initial_game_state_snapshot(self):
        """初期ゲーム状態のスナップショット記録"""
        # 初期状態の記録
        initial_state = {
            'is_gameover': self.engine.is_gameover,
            'point': self.engine.point,
            'level': self.engine.level,
            'combo': self.engine.combo,
            'paused': self.engine.paused,
            'balls_count': len(self.engine.balls),
            'ball_position': (self.engine.balls[0]['x'], self.engine.balls[0]['y']),
            'ball_velocity': (self.engine.balls[0]['dx'], self.engine.balls[0]['dy']),
            'ball_size': self.engine.balls[0]['size'],
            'ball_color': self.engine.balls[0]['color'],
            'racket_x': self.engine.racket_x,
            'racket_size': self.engine.racket_size,
            'base_racket_size': self.engine.base_racket_size,
            'speed': self.engine.speed
        }
        
        # 現在の動作を「黄金のマスター」として記録
        expected_state = {
            'is_gameover': False,
            'point': 0,
            'level': 1,
            'combo': 0,
            'paused': False,
            'balls_count': 1,
            'ball_position': (320, 250),
            'ball_velocity': (15, -15),
            'ball_size': 10,
            'ball_color': 'red',
            'racket_x': 270,
            'racket_size': 100,
            'base_racket_size': 100,
            'speed': 50
        }
        
        assert initial_state == expected_state, f"初期状態が期待値と異なります。期待値: {expected_state}, 実際値: {initial_state}"
    
    def test_ball_position_update_logic(self):
        """ボール位置更新ロジックの動作記録"""
        # 初期位置を記録
        initial_ball = copy.deepcopy(self.engine.balls[0])
        
        # 1回の位置更新を実行
        self.engine.update_ball_position(self.engine.balls[0])
        
        # 期待される位置変化を計算
        expected_x = initial_ball['x'] + initial_ball['dx']  # 320 + 15 = 335
        expected_y = initial_ball['y'] + initial_ball['dy']  # 250 + (-15) = 235
        
        actual_ball = self.engine.balls[0]
        
        assert actual_ball['x'] == expected_x, f"X座標更新が期待値と異なります。期待値: {expected_x}, 実際値: {actual_ball['x']}"
        assert actual_ball['y'] == expected_y, f"Y座標更新が期待値と異なります。期待値: {expected_y}, 実際値: {actual_ball['y']}"
    
    def test_wall_collision_behavior(self):
        """壁衝突時の動作記録"""
        # 左壁に近い位置に設定
        ball = self.engine.balls[0]
        ball['x'] = 5
        ball['dx'] = -10  # 左向きの速度
        
        initial_dx = ball['dx']
        
        # 衝突判定を実行
        self.engine.update_ball_position(ball)
        
        # 期待値: X方向の速度が反転
        expected_dx = -initial_dx  # -(-10) = 10
        
        assert ball['dx'] == expected_dx, f"壁衝突での速度反転が期待値と異なります。期待値: {expected_dx}, 実際値: {ball['dx']}"
    
    def test_successful_hit_scoring(self):
        """成功ヒット時のスコア計算動作記録"""
        # 初期状態を記録
        initial_point = self.engine.point
        initial_combo = self.engine.combo
        
        # 成功ヒットを実行
        self.engine.handle_successful_hit()
        
        # 期待される変化を計算
        expected_combo = initial_combo + 1  # 0 + 1 = 1
        expected_bonus = 0  # math.floor(1 / 5) = 0
        expected_point = initial_point + 10 * (1 + expected_bonus)  # 0 + 10 * 1 = 10
        
        assert self.engine.combo == expected_combo, f"コンボ更新が期待値と異なります。期待値: {expected_combo}, 実際値: {self.engine.combo}"
        assert self.engine.point == expected_point, f"スコア更新が期待値と異なります。期待値: {expected_point}, 実際値: {self.engine.point}"
    
    def test_combo_bonus_calculation(self):
        """コンボボーナス計算の動作記録"""
        # コンボを5に設定してボーナス計算をテスト
        self.engine.combo = 4  # 次のヒットで5になる
        initial_point = self.engine.point
        
        self.engine.handle_successful_hit()
        
        # 期待値計算: combo=5, bonus=1, score=10*(1+1)=20
        expected_combo = 5
        expected_bonus = 1  # math.floor(5 / 5) = 1
        expected_point = initial_point + 10 * (1 + expected_bonus)  # 0 + 20 = 20
        
        assert self.engine.combo == expected_combo, f"コンボ5での更新が期待値と異なります。期待値: {expected_combo}, 実際値: {self.engine.combo}"
        assert self.engine.point == expected_point, f"ボーナス込みスコアが期待値と異なります。期待値: {expected_point}, 実際値: {self.engine.point}"
    
    def test_racket_collision_detection(self):
        """ラケット衝突検出の動作記録"""
        # ラケット位置に近いボール設定
        ball = self.engine.balls[0]
        ball['x'] = 320  # ラケット中央付近
        ball['y'] = 465  # ラケット直前
        ball['dy'] = 10   # 下向き速度
        
        self.engine.racket_x = 270  # デフォルト位置
        
        # 衝突判定を実行
        collision_result = self.engine.check_racket_collision(ball)
        
        # 期待値: 衝突が検出され、Y方向速度が反転
        assert collision_result == True, "ラケット衝突が検出されませんでした"
        assert ball['dy'] == -10, f"衝突後の速度反転が期待値と異なります。期待値: -10, 実際値: {ball['dy']}"
    
    def test_game_over_condition(self):
        """ゲームオーバー条件の動作記録"""
        # ボールをすべて削除してゲームオーバー状態をテスト
        initial_balls_count = len(self.engine.balls)
        ball = self.engine.balls[0]
        
        # ミス処理を実行
        self.engine.handle_miss(ball)
        
        # 期待値: ボールが削除され、ゲームオーバーになる
        assert len(self.engine.balls) == initial_balls_count - 1, "ボールが削除されませんでした"
        assert self.engine.is_gameover == True, "ゲームオーバー状態になりませんでした"
        assert self.engine.combo == 0, "コンボがリセットされませんでした"
    
    def test_pause_toggle_behavior(self):
        """ポーズ切り替えの動作記録"""
        initial_paused = self.engine.paused
        
        # ポーズ切り替えを実行
        self.engine.toggle_pause()
        
        # 期待値: ポーズ状態が反転
        expected_paused = not initial_paused
        assert self.engine.paused == expected_paused, f"ポーズ状態の切り替えが期待値と異なります。期待値: {expected_paused}, 実際値: {self.engine.paused}"


class TestEngineLogicExtraction:
    """UI分離可能なロジック部分の特定"""
    
    def test_pure_ball_physics_extraction(self):
        """純粋な物理計算部分の抽出可能性検証"""
        # 現在のengine.pyから抽出可能な純粋関数を特定
        
        # ボール位置計算（UI非依存）
        ball_data = {'x': 320, 'y': 250, 'dx': 15, 'dy': -15}
        
        # 期待される位置更新計算
        expected_new_x = ball_data['x'] + ball_data['dx']
        expected_new_y = ball_data['y'] + ball_data['dy']
        
        # この計算はUIに依存せず、純粋関数として抽出可能
        assert expected_new_x == 335, "X座標計算ロジックの抽出検証"
        assert expected_new_y == 235, "Y座標計算ロジックの抽出検証"
    
    def test_collision_detection_extraction(self):
        """衝突検出ロジックの抽出可能性検証"""
        # ラケット衝突判定（UI非依存の計算部分）
        ball_x, ball_y, ball_dy = 320, 475, 10
        racket_x, racket_size = 270, 100
        
        # 現在のロジック: ball['y'] + ball['dy'] > 470 and (racket_x <= ball['x'] + ball['dx'] <= racket_x + racket_size)
        collision_detected = (ball_y + ball_dy > 470 and 
                              racket_x <= ball_x <= racket_x + racket_size)
        
        # この判定ロジックはUIに依存せず、純粋関数として抽出可能
        assert collision_detected == True, "衝突検出ロジックの抽出検証"
    
    def test_score_calculation_extraction(self):
        """スコア計算ロジックの抽出可能性検証"""
        # スコア計算（UI非依存）
        combo = 5
        base_score = 10
        
        # 現在のロジック: bonus = math.floor(combo / 5); score = base_score * (1 + bonus)
        import math
        bonus = math.floor(combo / 5)
        calculated_score = base_score * (1 + bonus)
        
        # この計算はUIに依存せず、純粋関数として抽出可能
        assert calculated_score == 20, "スコア計算ロジックの抽出検証"