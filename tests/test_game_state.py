"""
GameStateクラスのTDDテスト

個人開発規約遵守:
- TDD必須: テストファーストでGameState検証
- モック禁止: 純粋なロジックのため実環境テスト
- エラー3要素: 期待値と実際値の差分明示
"""

import pytest
import sys
import os
import math

# 相対インポートパスの設定
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from model.game_state import GameState, Ball, Racket, Score


class TestBallEntity:
    """Ballエンティティのテスト"""
    
    def test_ball_creation(self):
        """ボールの生成テスト"""
        ball = Ball(x=100.0, y=200.0, dx=5.0, dy=-10.0, size=8, color='blue')
        
        assert ball.x == 100.0, f"X座標が期待値と異なります。期待値: 100.0, 実際値: {ball.x}"
        assert ball.y == 200.0, f"Y座標が期待値と異なります。期待値: 200.0, 実際値: {ball.y}"
        assert ball.dx == 5.0, f"X速度が期待値と異なります。期待値: 5.0, 実際値: {ball.dx}"
        assert ball.dy == -10.0, f"Y速度が期待値と異なります。期待値: -10.0, 実際値: {ball.dy}"
        assert ball.size == 8, f"サイズが期待値と異なります。期待値: 8, 実際値: {ball.size}"
        assert ball.color == 'blue', f"色が期待値と異なります。期待値: 'blue', 実際値: {ball.color}"
    
    def test_ball_dict_conversion(self):
        """ボールの辞書変換テスト（既存コードとの互換性）"""
        ball = Ball(x=320.0, y=250.0, dx=15.0, dy=-15.0, size=10, color='red')
        ball_dict = ball.to_dict()
        
        expected_dict = {
            'x': 320.0,
            'y': 250.0,
            'dx': 15.0,
            'dy': -15.0,
            'size': 10,
            'color': 'red'
        }
        
        assert ball_dict == expected_dict, f"辞書変換が期待値と異なります。期待値: {expected_dict}, 実際値: {ball_dict}"
    
    def test_ball_from_dict(self):
        """辞書からのボール生成テスト"""
        ball_data = {
            'x': 400,
            'y': 300,
            'dx': -8,
            'dy': 12,
            'size': 12,
            'color': 'green'
        }
        
        ball = Ball.from_dict(ball_data)
        
        assert ball.x == 400, f"辞書からのX座標生成が失敗。期待値: 400, 実際値: {ball.x}"
        assert ball.y == 300, f"辞書からのY座標生成が失敗。期待値: 300, 実際値: {ball.y}"
        assert ball.dx == -8, f"辞書からのX速度生成が失敗。期待値: -8, 実際値: {ball.dx}"
        assert ball.dy == 12, f"辞書からのY速度生成が失敗。期待値: 12, 実際値: {ball.dy}"


class TestRacketEntity:
    """Racketエンティティのテスト"""
    
    def test_racket_creation(self):
        """ラケットの生成テスト"""
        racket = Racket(x=270.0, size=100, base_size=100)
        
        assert racket.x == 270.0, f"X座標が期待値と異なります。期待値: 270.0, 実際値: {racket.x}"
        assert racket.size == 100, f"サイズが期待値と異なります。期待値: 100, 実際値: {racket.size}"
        assert racket.base_size == 100, f"基本サイズが期待値と異なります。期待値: 100, 実際値: {racket.base_size}"
        assert racket.y == 470, f"Y座標が期待値と異なります。期待値: 470, 実際値: {racket.y}"
    
    def test_racket_edges(self):
        """ラケットの端座標計算テスト"""
        racket = Racket(x=200.0, size=80, base_size=80)
        
        assert racket.left_edge == 200.0, f"左端が期待値と異なります。期待値: 200.0, 実際値: {racket.left_edge}"
        assert racket.right_edge == 280.0, f"右端が期待値と異なります。期待値: 280.0, 実際値: {racket.right_edge}"


class TestScoreEntity:
    """Scoreエンティティのテスト"""
    
    def test_score_creation(self):
        """スコアの生成テスト"""
        score = Score()
        
        assert score.point == 0, f"初期ポイントが期待値と異なります。期待値: 0, 実際値: {score.point}"
        assert score.level == 1, f"初期レベルが期待値と異なります。期待値: 1, 実際値: {score.level}"
        assert score.combo == 0, f"初期コンボが期待値と異なります。期待値: 0, 実際値: {score.combo}"
    
    def test_hit_score_calculation_no_bonus(self):
        """ヒットスコア計算テスト（ボーナスなし）"""
        score = Score(combo=3)  # combo=3, bonus=0
        hit_score = score.calculate_hit_score()
        
        expected_score = 10 * (1 + 0)  # 10
        assert hit_score == expected_score, f"ヒットスコアが期待値と異なります。期待値: {expected_score}, 実際値: {hit_score}"
    
    def test_hit_score_calculation_with_bonus(self):
        """ヒットスコア計算テスト（ボーナス付き）"""
        score = Score(combo=5)  # combo=5, bonus=1
        hit_score = score.calculate_hit_score()
        
        expected_bonus = math.floor(5 / 5)  # 1
        expected_score = 10 * (1 + expected_bonus)  # 20
        assert hit_score == expected_score, f"ボーナス付きヒットスコアが期待値と異なります。期待値: {expected_score}, 実際値: {hit_score}"


class TestGameState:
    """GameStateクラスのテスト（特性化テストとの整合性確認）"""
    
    def setup_method(self):
        """各テストの前準備"""
        self.game_state = GameState()
    
    def test_initial_state_matches_characterization(self):
        """初期状態が特性化テストと一致することを確認"""
        snapshot = self.game_state.get_state_snapshot()
        
        # 特性化テストで記録した期待値
        expected_state = {
            'is_gameover': False,
            'paused': False,
            'speed': 50,
            'balls': [{
                'x': 320.0,
                'y': 250.0,
                'dx': 15.0,
                'dy': -15.0,
                'size': 10,
                'color': 'red'
            }],
            'racket': {
                'x': 270.0,
                'size': 100,
                'base_size': 100
            },
            'score': {
                'point': 0,
                'level': 1,
                'combo': 0
            }
        }
        
        assert snapshot == expected_state, f"初期状態が特性化テストと異なります。期待値: {expected_state}, 実際値: {snapshot}"
    
    def test_ball_position_update_matches_characterization(self):
        """ボール位置更新が特性化テストと一致することを確認"""
        ball = self.game_state.balls[0]
        initial_x, initial_y = ball.x, ball.y
        initial_dx, initial_dy = ball.dx, ball.dy
        
        # 1回の位置更新
        self.game_state.update_ball_position(ball)
        
        # 特性化テストの期待値: x=320+15=335, y=250+(-15)=235
        expected_x = initial_x + initial_dx  # 335
        expected_y = initial_y + initial_dy  # 235
        
        assert ball.x == expected_x, f"X座標更新が特性化テストと異なります。期待値: {expected_x}, 実際値: {ball.x}"
        assert ball.y == expected_y, f"Y座標更新が特性化テストと異なります。期待値: {expected_y}, 実際値: {ball.y}"
    
    def test_wall_collision_matches_characterization(self):
        """壁衝突が特性化テストと一致することを確認"""
        ball = self.game_state.balls[0]
        ball.x = 5.0
        ball.dx = -10.0
        initial_dx = ball.dx
        
        # 衝突判定実行
        collision_occurred = self.game_state.update_ball_position(ball)
        
        # 特性化テストの期待値: dx反転
        expected_dx = -initial_dx  # 10.0
        
        assert collision_occurred == True, "壁衝突が検出されませんでした"
        assert ball.dx == expected_dx, f"壁衝突での速度反転が特性化テストと異なります。期待値: {expected_dx}, 実際値: {ball.dx}"
    
    def test_successful_hit_scoring_matches_characterization(self):
        """成功ヒットスコアリングが特性化テストと一致することを確認"""
        initial_point = self.game_state.score.point
        initial_combo = self.game_state.score.combo
        
        # 成功ヒット処理実行
        self.game_state._handle_successful_hit()
        
        # 特性化テストの期待値
        expected_combo = initial_combo + 1  # 1
        expected_bonus = math.floor(expected_combo / 5)  # 0
        expected_point = initial_point + 10 * (1 + expected_bonus)  # 10
        
        assert self.game_state.score.combo == expected_combo, f"コンボ更新が特性化テストと異なります。期待値: {expected_combo}, 実際値: {self.game_state.score.combo}"
        assert self.game_state.score.point == expected_point, f"スコア更新が特性化テストと異なります。期待値: {expected_point}, 実際値: {self.game_state.score.point}"
    
    def test_combo_bonus_calculation_matches_characterization(self):
        """コンボボーナス計算が特性化テストと一致することを確認"""
        # コンボを4に設定（次のヒットで5になる）
        self.game_state.score.combo = 4
        initial_point = self.game_state.score.point
        
        self.game_state._handle_successful_hit()
        
        # 特性化テストの期待値: combo=5, bonus=1, score=20
        expected_combo = 5
        expected_bonus = math.floor(5 / 5)  # 1
        expected_point = initial_point + 10 * (1 + expected_bonus)  # 20
        
        assert self.game_state.score.combo == expected_combo, f"コンボ5での更新が特性化テストと異なります。期待値: {expected_combo}, 実際値: {self.game_state.score.combo}"
        assert self.game_state.score.point == expected_point, f"ボーナス込みスコアが特性化テストと異なります。期待値: {expected_point}, 実際値: {self.game_state.score.point}"
    
    def test_racket_collision_detection_matches_characterization(self):
        """ラケット衝突検出が特性化テストと一致することを確認"""
        ball = self.game_state.balls[0]
        ball.x = 320.0
        ball.y = 465.0
        ball.dy = 10.0
        
        # 衝突判定実行
        collision_occurred = self.game_state.update_ball_position(ball)
        
        # 特性化テストの期待値: 衝突検出、Y速度反転
        assert collision_occurred == True, "ラケット衝突が検出されませんでした"
        assert ball.dy == -10.0, f"衝突後の速度反転が特性化テストと異なります。期待値: -10.0, 実際値: {ball.dy}"
    
    def test_game_over_condition_matches_characterization(self):
        """ゲームオーバー条件が特性化テストと一致することを確認"""
        ball = self.game_state.balls[0]
        initial_balls_count = len(self.game_state.balls)
        
        # ミス処理実行
        self.game_state._handle_miss(ball)
        
        # 特性化テストの期待値
        assert len(self.game_state.balls) == initial_balls_count - 1, "ボールが削除されませんでした"
        assert self.game_state.is_gameover == True, "ゲームオーバー状態になりませんでした"
        assert self.game_state.score.combo == 0, "コンボがリセットされませんでした"
    
    def test_pause_toggle_matches_characterization(self):
        """ポーズ切り替えが特性化テストと一致することを確認"""
        initial_paused = self.game_state.paused
        
        # ポーズ切り替え実行
        self.game_state.toggle_pause()
        
        # 特性化テストの期待値: ポーズ状態反転
        expected_paused = not initial_paused
        assert self.game_state.paused == expected_paused, f"ポーズ状態切り替えが特性化テストと異なります。期待値: {expected_paused}, 実際値: {self.game_state.paused}"
    
    def test_racket_position_update(self):
        """ラケット位置更新テスト"""
        # 正常範囲内での移動
        self.game_state.update_racket_position(300.0)
        assert self.game_state.racket.x == 300.0, f"ラケット位置更新が失敗。期待値: 300.0, 実際値: {self.game_state.racket.x}"
        
        # 左端制限テスト
        self.game_state.update_racket_position(-50.0)
        assert self.game_state.racket.x == 0.0, f"左端制限が失敗。期待値: 0.0, 実際値: {self.game_state.racket.x}"
        
        # 右端制限テスト
        self.game_state.update_racket_position(700.0)
        expected_x = GameState.SCREEN_WIDTH - self.game_state.racket.size  # 640 - 100 = 540
        assert self.game_state.racket.x == expected_x, f"右端制限が失敗。期待値: {expected_x}, 実際値: {self.game_state.racket.x}"
    
    def test_game_reset(self):
        """ゲームリセットテスト"""
        # ゲーム状態を変更
        self.game_state.is_gameover = True
        self.game_state.paused = True
        self.game_state.score.point = 100
        self.game_state.score.combo = 5
        
        # リセット実行
        self.game_state.reset_game()
        
        # 初期状態に戻ることを確認
        assert self.game_state.is_gameover == False, "ゲームオーバー状態がリセットされませんでした"
        assert self.game_state.paused == False, "ポーズ状態がリセットされませんでした"
        assert self.game_state.score.point == 0, "スコアがリセットされませんでした"
        assert self.game_state.score.combo == 0, "コンボがリセットされませんでした"
        assert len(self.game_state.balls) == 1, "ボール数がリセットされませんでした"
        assert self.game_state.balls[0].x == 320.0, "ボール位置がリセットされませんでした"