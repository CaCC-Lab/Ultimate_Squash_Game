"""
Pygame-CE版MVC統合テスト

個人開発規約遵守:
- TDD必須: MVCパターン統合テスト
- モック禁止: 実際のPygameコンポーネントでテスト
- エラー3要素: 統合時のエラーハンドリング検証

技術移行検証:
- Python 3.6 → 3.12対応確認
- Tkinter → Pygame-CE移植確認
- MVCパターン移植確認
"""

import pytest
import pygame
import sys
import os

# 絶対インポートパスの設定
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, '..', 'src')
sys.path.insert(0, src_dir)

from model.pygame_game_state import PygameGameState, PygameBall, PygameRacket, PygameScore
from view.pygame_game_view import PygameGameView, PygameSoundView
from controller.pygame_game_controller import PygameGameController


class TestPygameMVCIntegration:
    """Pygame-CE版MVCパターン統合テスト"""
    
    def setup_method(self):
        """各テストの前準備"""
        # Pygame初期化（テスト用）
        pygame.init()
        pygame.display.set_mode((1, 1))  # 最小ウィンドウ（テスト用）
        
        # 仮想スクリーン作成（描画テスト用）
        self.screen = pygame.Surface((640, 480))
        
        # MVCコンポーネント作成
        self.game_state = PygameGameState()
        self.game_view = PygameGameView(self.screen)
        self.sound_view = PygameSoundView(sound_enabled=False)  # テスト用は無音
        self.controller = PygameGameController(
            self.game_state, 
            self.game_view, 
            self.sound_view,
            target_fps=60
        )
    
    def teardown_method(self):
        """各テスト後のクリーンアップ"""
        self.controller.cleanup()
        pygame.quit()
    
    def test_mvc_pattern_initialization(self):
        """MVCパターン初期化テスト"""
        # Model（GameState）の初期化確認
        assert self.game_state is not None, "GameStateが初期化されていません"
        assert len(self.game_state.balls) == 1, "初期ボール数が正しくありません"
        assert self.game_state.racket is not None, "ラケットが初期化されていません"
        assert self.game_state.score is not None, "スコアが初期化されていません"
        
        # View（GameView）の初期化確認
        assert self.game_view is not None, "GameViewが初期化されていません"
        assert self.game_view.screen == self.screen, "Screenが正しく設定されていません"
        assert self.game_view.width == 640, "画面幅が正しく設定されていません"
        assert self.game_view.height == 480, "画面高さが正しく設定されていません"
        
        # Controller（GameController）の初期化確認
        assert self.controller is not None, "GameControllerが初期化されていません"
        assert self.controller.game_state == self.game_state, "ControllerのGameState参照が正しくありません"
        assert self.controller.game_view == self.game_view, "ControllerのGameView参照が正しくありません"
        assert self.controller.target_fps == 60, "目標FPSが正しく設定されていません"
    
    def test_observer_pattern_integration(self):
        """Observerパターン統合テスト"""
        # GameViewがGameStateのObserverとして登録されているか確認
        assert self.game_view in self.game_state._observers, "GameViewがObserverとして登録されていません"
        
        # Observer通知のテスト（ラケット移動）
        initial_racket_x = self.game_state.racket.x
        new_position = 300.0
        
        # ラケット位置更新（Observer通知を発生させる）
        self.game_state.update_racket_position(new_position)
        
        # 状態変更が正しく反映されているか確認
        assert self.game_state.racket.x == new_position, f"ラケット位置更新が失敗。期待値: {new_position}, 実際値: {self.game_state.racket.x}"
        
        # ViewのUI状態も同期更新されているか（描画は実際に確認困難だが、エラーが発生しないことを確認）
        try:
            self.game_view.draw_game(self.game_state)
            assert True, "Observer通知後の描画が正常に実行されました"
        except Exception as e:
            pytest.fail(f"Observer通知後の描画でエラーが発生: {str(e)}")
    
    def test_controller_mouse_integration(self):
        """Controller マウス統合テスト"""
        # マウス移動イベント処理テスト
        initial_racket_x = self.game_state.racket.x
        mouse_x = 350
        
        # Controllerを通じたマウス処理
        self.controller.handle_mouse_motion(mouse_x)
        
        # ラケット位置がマウス位置に同期更新されているか確認
        assert self.game_state.racket.x == mouse_x, f"マウス連動が失敗。期待値: {mouse_x}, 実際値: {self.game_state.racket.x}"
        
        # ゲームオーバー時は移動しないことを確認
        self.game_state.is_gameover = True
        previous_x = self.game_state.racket.x
        self.controller.handle_mouse_motion(400)
        assert self.game_state.racket.x == previous_x, "ゲームオーバー時にラケットが移動しました"
        
        # ポーズ時も移動しないことを確認
        self.game_state.is_gameover = False
        self.game_state.paused = True
        previous_x = self.game_state.racket.x
        self.controller.handle_mouse_motion(450)
        assert self.game_state.racket.x == previous_x, "ポーズ時にラケットが移動しました"
    
    def test_controller_click_integration(self):
        """Controller クリック統合テスト"""
        # ゲーム状態を変更
        self.game_state.is_gameover = True
        self.game_state.score.point = 500
        self.game_state.score.combo = 3
        
        # 左クリック処理
        self.controller.handle_mouse_click(1)  # 左クリック
        
        # ゲームがリセットされていることを確認
        assert self.game_state.is_gameover == False, "ゲームオーバー状態がリセットされていません"
        assert self.game_state.score.point == 0, "スコアがリセットされていません"
        assert self.game_state.score.combo == 0, "コンボがリセットされていません"
        assert len(self.game_state.balls) == 1, "ボール数がリセットされていません"
    
    def test_game_physics_integration(self):
        """ゲーム物理演算統合テスト"""
        # 初期ボール状態
        ball = self.game_state.balls[0]
        initial_x = ball.x
        initial_y = ball.y
        
        # 1フレーム更新
        collision_occurred = self.game_state.update_ball_position(ball)
        
        # ボール位置が更新されていることを確認
        expected_x = initial_x + ball.dx
        expected_y = initial_y + ball.dy
        assert ball.x == expected_x, f"ボールX座標更新が失敗。期待値: {expected_x}, 実際値: {ball.x}"
        assert ball.y == expected_y, f"ボールY座標更新が失敗。期待値: {expected_y}, 実際値: {ball.y}"
        
        # 衝突判定が動作することを確認（壁衝突テスト）
        ball.x = 5.0
        ball.dx = -10.0
        collision_occurred = self.game_state.update_ball_position(ball)
        assert collision_occurred == True, "壁衝突が検出されませんでした"
        assert ball.dx > 0, "壁衝突後の速度反転が正しくありません"
    
    def test_pygame_drawing_integration(self):
        """Pygame描画統合テスト"""
        # 描画処理が例外なく実行されることを確認
        try:
            self.game_view.draw_game(self.game_state)
            assert True, "Pygame描画が正常に実行されました"
        except Exception as e:
            pytest.fail(f"Pygame描画でエラーが発生: {str(e)}")
        
        # 各状態での描画テスト
        # ポーズ状態
        self.game_state.paused = True
        try:
            self.game_view.draw_game(self.game_state)
            assert True, "ポーズ状態での描画が正常に実行されました"
        except Exception as e:
            pytest.fail(f"ポーズ状態描画でエラーが発生: {str(e)}")
        
        # ゲームオーバー状態
        self.game_state.paused = False
        self.game_state.is_gameover = True
        try:
            self.game_view.draw_game(self.game_state)
            assert True, "ゲームオーバー状態での描画が正常に実行されました"
        except Exception as e:
            pytest.fail(f"ゲームオーバー状態描画でエラーが発生: {str(e)}")
    
    def test_python_312_compatibility(self):
        """Python 3.12対応確認テスト"""
        import sys
        
        # Python 3.12環境での実行確認
        assert sys.version_info >= (3, 12), f"Python 3.12以上が必要です。現在のバージョン: {sys.version}"
        
        # 型ヒントの動作確認
        ball: PygameBall = self.game_state.balls[0]
        assert isinstance(ball, PygameBall), "型ヒントが正しく動作していません"
        
        # 新しいPython 3.12機能（match文など）の使用可能性確認
        test_value = "pygame"
        match test_value:
            case "pygame":
                result = "pygame_matched"
            case _:
                result = "no_match"
        
        assert result == "pygame_matched", "Python 3.12のmatch文が正しく動作していません"
    
    def test_error_handling_integration(self):
        """エラーハンドリング統合テスト"""
        # 不正なマウス座標でのエラーハンドリング
        try:
            self.controller.handle_mouse_motion(-100)  # 負の座標
            # エラーが適切に処理され、例外で停止しないことを確認
            assert True, "不正座標が適切に処理されました"
        except Exception as e:
            pytest.fail(f"エラーハンドリングが不適切: {str(e)}")
        
        # 描画エラー時のフォールバック処理テスト
        # (実際の描画エラーを発生させるのは困難なため、安全なクリア処理をテスト)
        try:
            self.game_view._safe_clear_screen()
            assert True, "安全なクリア処理が正常に動作しました"
        except Exception as e:
            pytest.fail(f"安全なクリア処理でエラー: {str(e)}")


class TestPygameEntityCreation:
    """Pygame エンティティ作成テスト"""
    
    def test_pygame_ball_creation(self):
        """PygameBall作成テスト"""
        ball = PygameBall(x=100.0, y=200.0, dx=5.0, dy=-10.0, size=10, color=(255, 0, 0))
        
        assert ball.x == 100.0, f"X座標が期待値と異なります。期待値: 100.0, 実際値: {ball.x}"
        assert ball.y == 200.0, f"Y座標が期待値と異なります。期待値: 200.0, 実際値: {ball.y}"
        assert ball.color == (255, 0, 0), f"色が期待値と異なります。期待値: (255, 0, 0), 実際値: {ball.color}"
        assert ball.radius == 5, f"半径が期待値と異なります。期待値: 5, 実際値: {ball.radius}"
    
    def test_pygame_racket_creation(self):
        """PygameRacket作成テスト"""
        racket = PygameRacket(x=270.0, size=100, base_size=100)
        
        assert racket.x == 270.0, f"X座標が期待値と異なります。期待値: 270.0, 実際値: {racket.x}"
        assert racket.y == 470, f"Y座標が期待値と異なります。期待値: 470, 実際値: {racket.y}"
        assert racket.size == 100, f"サイズが期待値と異なります。期待値: 100, 実際値: {racket.size}"
        assert racket.color == (255, 255, 0), f"色が期待値と異なります。期待値: (255, 255, 0), 実際値: {racket.color}"
    
    def test_pygame_score_creation(self):
        """PygameScore作成テスト"""
        score = PygameScore()
        
        assert score.point == 0, f"初期ポイントが期待値と異なります。期待値: 0, 実際値: {score.point}"
        assert score.level == 1, f"初期レベルが期待値と異なります。期待値: 1, 実際値: {score.level}"
        assert score.combo == 0, f"初期コンボが期待値と異なります。期待値: 0, 実際値: {score.combo}"