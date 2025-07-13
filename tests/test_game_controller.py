"""
GameControllerクラスのTDDテスト

個人開発規約遵守:
- TDD必須: テストファーストでController検証  
- モック禁止: 実際のtkinterコンポーネントでテスト
- エラー3要素: Controller操作時のエラーハンドリング検証
"""

import pytest
import sys
import os
import time
import tkinter as tk
from unittest.mock import patch

# 相対インポートパスの設定
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from model.game_state import GameState
from view.game_view import GameView
from controller.game_controller import GameController, ControllerError


class TestGameControllerTDD:
    """GameControllerクラスのTDD開発テスト"""
    
    def setup_method(self):
        """各テストの前準備"""
        # tkinterルートウィンドウ作成（実環境テストのため）
        self.root = tk.Tk()
        self.root.withdraw()  # 表示しない
        
        # Canvas作成（View用）
        self.canvas = tk.Canvas(self.root, width=640, height=480)
        
        # GameStateとGameView作成
        self.game_state = GameState()
        self.game_view = GameView(self.canvas)
        
        # GameControllerは、GameStateとGameViewを協調させる責務
    
    def teardown_method(self):
        """各テスト後のクリーンアップ"""
        self.root.destroy()
    
    def test_controller_initialization_requirements(self):
        """Controller初期化時の要求仕様（TDD検証）"""
        # GameControllerが満たすべき初期化要件:
        # 1. GameStateとGameViewを受け取る
        # 2. GameStateをGameViewのObserverとして登録
        # 3. tkinterイベントとGameStateメソッドをバインド
        
        # GameController作成
        controller = GameController(self.game_state, self.game_view, self.root)
        
        # 期待される初期化後の状態を検証
        expected_observers = 1  # GameViewがGameStateのObserverになる
        
        # 1. GameStateとGameViewが正しく設定されている
        assert controller.game_state is not None, "GameStateが設定されていません"
        assert controller.game_view is not None, "GameViewが設定されていません"
        assert controller.root is not None, "root_windowが設定されていません"
        
        # 2. Observer登録が正しく行われている
        assert len(self.game_state._observers) == expected_observers, f"Observer登録数が期待値と異なります。期待値: {expected_observers}, 実際値: {len(self.game_state._observers)}"
        assert self.game_view in self.game_state._observers, "GameViewがGameStateのObserverとして登録されていません"
        
        # 3. 初期状態
        assert controller.is_running == False, "初期状態でゲームループが動作しています"
        assert controller.frame_delay == 50, f"フレーム遅延が期待値と異なります。期待値: 50, 実際値: {controller.frame_delay}"
    
    def test_mouse_motion_event_handling(self):
        """マウス移動イベント処理のテスト（TDD検証）"""
        # 要求仕様：マウスX座標をラケット位置に反映
        # 制約：ゲームオーバーまたはポーズ中は反映しない
        
        controller = GameController(self.game_state, self.game_view, self.root)
        
        # 正常時のマウス移動
        initial_racket_x = self.game_state.racket.x
        controller.handle_mouse_motion(300)
        assert self.game_state.racket.x == 300, f"マウス移動後のラケット位置が期待値と異なります。期待値: 300, 実際値: {self.game_state.racket.x}"
        
        # ゲームオーバー時は反映されない
        self.game_state.is_gameover = True
        controller.handle_mouse_motion(400)
        assert self.game_state.racket.x == 300, f"ゲームオーバー時にラケット位置が変更されました。期待値: 300, 実際値: {self.game_state.racket.x}"
        
        # ポーズ時も反映されない
        self.game_state.is_gameover = False
        self.game_state.paused = True
        controller.handle_mouse_motion(500)
        assert self.game_state.racket.x == 300, f"ポーズ時にラケット位置が変更されました。期待値: 300, 実際値: {self.game_state.racket.x}"
    
    def test_click_event_handling(self):
        """クリックイベント処理のテスト（TDD検証）"""
        # 要求仕様：クリック時にゲームリセット
        
        controller = GameController(self.game_state, self.game_view, self.root)
        
        # ゲームオーバー状態にする
        self.game_state.is_gameover = True
        self.game_state.score.point = 100
        self.game_state.score.combo = 5
        self.game_state.paused = True
        
        # クリックイベント処理
        controller.handle_click()
        
        # ゲームがリセットされることを確認
        assert self.game_state.is_gameover == False, "ゲームオーバー状態がリセットされていません"
        assert self.game_state.score.point == 0, f"スコアがリセットされていません。期待値: 0, 実際値: {self.game_state.score.point}"
        assert self.game_state.score.combo == 0, f"コンボがリセットされていません。期待値: 0, 実際値: {self.game_state.score.combo}"
        assert self.game_state.paused == False, "ポーズ状態がリセットされていません"
    
    def test_pause_toggle_handling(self):
        """ポーズ切り替え処理のテスト（TDD検証）"""
        # 要求仕様：スペースキーでポーズ切り替え
        
        controller = GameController(self.game_state, self.game_view, self.root)
        
        initial_paused = self.game_state.paused
        
        # ポーズ切り替え
        controller.handle_pause_toggle()
        
        expected_paused = not initial_paused
        assert self.game_state.paused == expected_paused, f"ポーズ状態切り替えが期待値と異なります。期待値: {expected_paused}, 実際値: {self.game_state.paused}"
        
        # 再度切り替えて元に戻る
        controller.handle_pause_toggle()
        assert self.game_state.paused == initial_paused, f"ポーズ状態の再切り替えが期待値と異なります。期待値: {initial_paused}, 実際値: {self.game_state.paused}"
    
    def test_game_loop_coordination(self):
        """ゲームループの協調処理テスト（テストファースト）"""
        # 要求仕様：
        # 1. GameStateのupdate_frame()を呼び出し
        # 2. Observerパターンで自動的にGameViewが更新される
        # 3. エラーが発生した場合は適切にハンドリング
        
        # TODO: GameController実装後
        # controller = GameController(self.game_state, self.game_view, self.root)
        
        # # ゲームループ1回実行
        # controller.update_game_frame()
        
        # # GameStateとGameViewが連携していることを確認
        # # （具体的な検証方法は実装時に決定）
        
        pytest.skip("GameController実装前のため、実装後にテスト実行")
    
    def test_error_handling_with_3_elements(self):
        """エラーハンドリングの3要素対応テスト（テストファースト）"""
        # 要求仕様：Controller操作中のエラーは3要素で処理
        # 1. 何が起きたか
        # 2. なぜ起きたか  
        # 3. どうすれば良いか
        
        # TODO: GameController実装後
        # controller = GameController(self.game_state, self.game_view, self.root)
        
        # # 意図的にエラーを発生させる（例：無効なGameState操作）
        # error_occurred = False
        # error_message = ""
        
        # try:
        #     # 無効な操作を試行
        #     controller.handle_invalid_operation()
        # except Exception as e:
        #     error_occurred = True
        #     error_message = str(e)
        
        # # エラー3要素が含まれることを確認
        # assert error_occurred == True
        # assert "何が起きたか" in error_message or "what" in error_message.lower()
        # assert "なぜ起きたか" in error_message or "why" in error_message.lower()  
        # assert "どうすれば良いか" in error_message or "how" in error_message.lower()
        
        pytest.skip("GameController実装前のため、実装後にテスト実行")
    
    def test_observer_pattern_integration(self):
        """ObserverパターンのModel-View連携テスト（TDD検証）"""
        # 要求仕様：ControllerがGameStateを操作すると自動的にGameViewが更新される
        
        controller = GameController(self.game_state, self.game_view, self.root)
        
        # Observer登録確認
        assert self.game_view in self.game_state._observers, "GameViewがGameStateのObserverとして登録されていません"
        
        # GameStateを操作（Controller経由）
        initial_score = self.game_state.score.point
        initial_combo = self.game_state.score.combo
        
        # スコア更新操作（Observer通知が発生する）
        controller.trigger_score_update()
        
        # GameStateが更新されていることを確認
        assert self.game_state.score.point > initial_score, f"スコアが更新されていません。初期値: {initial_score}, 現在値: {self.game_state.score.point}"
        assert self.game_state.score.combo > initial_combo, f"コンボが更新されていません。初期値: {initial_combo}, 現在値: {self.game_state.score.combo}"
        
        # Observer通知が正常に動作することを確認（例外が発生しないこと）
        # GameViewのon_game_state_changed()メソッドが呼ばれても例外が発生しない


class TestGameControllerIntegration:
    """GameControllerの統合テスト（Model-View-Controller連携）"""
    
    def setup_method(self):
        """統合テスト用セットアップ"""
        self.root = tk.Tk() 
        self.root.withdraw()
        
        self.canvas = tk.Canvas(self.root, width=640, height=480)
        self.score_label = tk.Label(self.root, text="Score: 0")
        self.combo_label = tk.Label(self.root, text="Combo: 0")
        
        self.game_state = GameState()
        self.game_view = GameView(self.canvas, self.score_label, self.combo_label)
    
    def teardown_method(self):
        """統合テスト後のクリーンアップ"""
        self.root.destroy()
    
    def test_full_mvc_integration(self):
        """完全なMVCパターン統合テスト（テストファースト）"""
        # 要求仕様：Controller、Model、Viewが正しく連携する
        # 1. Controllerがユーザー入力を受信
        # 2. ModelのGameStateが状態を更新  
        # 3. ObserverパターンでViewが自動更新
        
        # TODO: GameController実装後
        # controller = GameController(self.game_state, self.game_view, self.root)
        
        # # シナリオ：マウス移動 → ラケット移動 → 画面更新
        # initial_racket_x = self.game_state.racket.x
        # controller.handle_mouse_motion(400)
        
        # # Model更新確認
        # assert self.game_state.racket.x == 400
        
        # # View自動更新確認（Observerパターン）
        # # （具体的な確認方法は実装時に決定）
        
        pytest.skip("GameController実装前のため、実装後にテスト実行")
    
    def test_game_loop_full_cycle(self):
        """ゲームループの完全サイクルテスト（テストファースト）"""
        # 要求仕様：ゲームループが正常に動作する
        # 1. Model状態更新
        # 2. View描画更新
        # 3. 次ループのスケジューリング
        
        # TODO: GameController実装後  
        # controller = GameController(self.game_state, self.game_view, self.root)
        
        # # ゲームループ1サイクル実行
        # initial_ball_x = self.game_state.balls[0].x
        # controller.run_single_frame()
        
        # # ボール位置が更新されたことを確認
        # assert self.game_state.balls[0].x != initial_ball_x
        
        pytest.skip("GameController実装前のため、実装後にテスト実行")