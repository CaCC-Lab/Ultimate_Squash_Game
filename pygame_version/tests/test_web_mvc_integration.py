"""
Web環境MVC統合テスト

個人開発規約遵守:
- TDD必須: Web環境MVCパターン統合テスト
- モック禁止: 実際のWeb環境コンポーネントでテスト
- エラー3要素: Web統合時のエラーハンドリング検証

技術移行検証:
- Pygame-CE → Canvas API移植確認
- JavaScript連携機能確認
- Pyodide環境対応確認
"""

import pytest
import json
import sys
import os

# 絶対インポートパスの設定
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, '..', 'src')
sys.path.insert(0, src_dir)

from model.pygame_game_state import PygameGameState, PygameBall, PygameRacket, PygameScore
from view.web_game_view import WebCanvasView, WebSoundView
from controller.web_game_controller import WebGameController


class TestWebMVCIntegration:
    """Web環境MVCパターン統合テスト"""
    
    def setup_method(self):
        """各テストの前準備"""
        # MVCコンポーネント作成（Web環境用）
        self.game_state = PygameGameState()
        self.canvas_view = WebCanvasView("testCanvas", 640, 480)
        self.sound_view = WebSoundView(sound_enabled=False)  # テスト用は無音
        self.web_controller = WebGameController(
            self.game_state,
            self.canvas_view,
            self.sound_view,
            target_fps=60.0
        )
    
    def teardown_method(self):
        """各テスト後のクリーンアップ"""
        self.web_controller.cleanup()
    
    def test_web_mvc_pattern_initialization(self):
        """Web環境MVCパターン初期化テスト"""
        # Model（GameState）の初期化確認
        assert self.game_state is not None, "GameStateが初期化されていません"
        assert len(self.game_state.balls) == 1, "初期ボール数が正しくありません"
        assert self.game_state.racket is not None, "ラケットが初期化されていません"
        assert self.game_state.score is not None, "スコアが初期化されていません"
        
        # View（WebCanvasView）の初期化確認
        assert self.canvas_view is not None, "WebCanvasViewが初期化されていません"
        assert self.canvas_view.canvas_id == "testCanvas", "Canvas IDが正しく設定されていません"
        assert self.canvas_view.width == 640, "画面幅が正しく設定されていません"
        assert self.canvas_view.height == 480, "画面高さが正しく設定されていません"
        
        # Controller（WebGameController）の初期化確認
        assert self.web_controller is not None, "WebGameControllerが初期化されていません"
        assert self.web_controller.game_state == self.game_state, "ControllerのGameState参照が正しくありません"
        assert self.web_controller.canvas_view == self.canvas_view, "ControllerのCanvasView参照が正しくありません"
        assert self.web_controller.target_fps == 60.0, "目標FPSが正しく設定されていません"
    
    def test_web_observer_pattern_integration(self):
        """Web環境Observerパターン統合テスト"""
        # CanvasViewがGameStateのObserverとして登録されているか確認
        assert self.canvas_view in self.game_state._observers, "CanvasViewがObserverとして登録されていません"
        
        # Observer通知のテスト（ラケット移動）
        initial_racket_x = self.game_state.racket.x
        new_position = 300.0
        
        # ラケット位置更新（Observer通知を発生させる）
        self.game_state.update_racket_position(new_position)
        
        # 状態変更が正しく反映されているか確認
        assert self.game_state.racket.x == new_position, f"ラケット位置更新が失敗。期待値: {new_position}, 実際値: {self.game_state.racket.x}"
        
        # Canvas View のフレームデータが更新されているか確認
        assert self.canvas_view.frame_count > 0, "Canvas Viewのフレームカウントが更新されていません"
    
    def test_web_controller_mouse_integration(self):
        """Web Controller マウス統合テスト"""
        # マウス移動イベント処理テスト
        initial_racket_x = self.game_state.racket.x
        mouse_x = 350.0
        
        # Web Controllerを通じたマウス処理
        self.web_controller.handle_mouse_motion(mouse_x)
        
        # ラケット位置がマウス位置に同期更新されているか確認
        assert self.game_state.racket.x == mouse_x, f"マウス連動が失敗。期待値: {mouse_x}, 実際値: {self.game_state.racket.x}"
        
        # ゲームオーバー時は移動しないことを確認
        self.game_state.is_gameover = True
        previous_x = self.game_state.racket.x
        self.web_controller.handle_mouse_motion(400.0)
        assert self.game_state.racket.x == previous_x, "ゲームオーバー時にラケットが移動しました"
        
        # ポーズ時も移動しないことを確認
        self.game_state.is_gameover = False
        self.game_state.paused = True
        previous_x = self.game_state.racket.x
        self.web_controller.handle_mouse_motion(450.0)
        assert self.game_state.racket.x == previous_x, "ポーズ時にラケットが移動しました"
    
    def test_web_controller_click_integration(self):
        """Web Controller クリック統合テスト"""
        # ゲーム状態を変更
        self.game_state.is_gameover = True
        self.game_state.score.point = 500
        self.game_state.score.combo = 3
        
        # 左クリック処理（Web環境では button=0）
        self.web_controller.handle_mouse_click(0)
        
        # ゲームがリセットされていることを確認
        assert self.game_state.is_gameover == False, "ゲームオーバー状態がリセットされていません"
        assert self.game_state.score.point == 0, "スコアがリセットされていません"
        assert self.game_state.score.combo == 0, "コンボがリセットされていません"
        assert len(self.game_state.balls) == 1, "ボール数がリセットされていません"
    
    def test_web_controller_key_integration(self):
        """Web Controller キー統合テスト"""
        # スペースキーでポーズ切り替えテスト
        initial_pause_state = self.game_state.paused
        self.web_controller.handle_key_press("Space")
        assert self.game_state.paused != initial_pause_state, "スペースキーでポーズ状態が切り替わりません"
        
        # Rキーでリセットテスト
        self.game_state.score.point = 100
        self.web_controller.handle_key_press("KeyR")
        assert self.game_state.score.point == 0, "Rキーでゲームがリセットされません"
        
        # Escapeキーで停止テスト
        self.web_controller.handle_key_press("Escape")
        assert self.web_controller.is_running == False, "Escapeキーでゲームが停止しません"
    
    def test_canvas_data_conversion(self):
        """Canvas描画データ変換テスト"""
        # ゲーム状態を設定
        ball = self.game_state.balls[0]
        ball.x = 100.0
        ball.y = 200.0
        ball.color = (255, 0, 0)  # 赤色
        
        # Canvas描画データ変換をトリガー
        self.canvas_view.on_game_state_changed(self.game_state)
        
        # JavaScript連携データ取得
        interface_data_json = self.canvas_view.get_javascript_interface_data()
        interface_data = json.loads(interface_data_json)
        
        # データ構造確認
        assert 'frame_data' in interface_data, "フレームデータが含まれていません"
        assert 'draw_commands' in interface_data, "描画コマンドが含まれていません"
        
        frame_data = interface_data['frame_data']
        assert 'balls' in frame_data, "ボールデータが含まれていません"
        assert 'racket' in frame_data, "ラケットデータが含まれていません"
        assert 'score' in frame_data, "スコアデータが含まれていません"
        
        # ボールデータの正確性確認
        ball_data = frame_data['balls'][0]
        assert ball_data['x'] == 100.0, f"ボールX座標変換が不正確: {ball_data['x']}"
        assert ball_data['y'] == 200.0, f"ボールY座標変換が不正確: {ball_data['y']}"
        assert ball_data['color'] == "rgb(255, 0, 0)", f"ボール色変換が不正確: {ball_data['color']}"
    
    def test_rgb_to_css_conversion(self):
        """RGB → CSS色変換テスト"""
        # RGB tupleのCSS色変換確認
        test_cases = [
            ((255, 0, 0), "rgb(255, 0, 0)"),      # 赤
            ((0, 255, 0), "rgb(0, 255, 0)"),      # 緑  
            ((0, 0, 255), "rgb(0, 0, 255)"),      # 青
            ((255, 255, 0), "rgb(255, 255, 0)"),  # 黄
            ((128, 128, 128), "rgb(128, 128, 128)") # グレー
        ]
        
        for rgb_input, expected_css in test_cases:
            result = self.canvas_view._rgb_to_css_color(rgb_input)
            assert result == expected_css, f"RGB変換失敗: {rgb_input} → {result} (期待値: {expected_css})"
    
    def test_draw_commands_generation(self):
        """描画コマンド生成テスト"""
        # ゲーム状態更新
        self.canvas_view.on_game_state_changed(self.game_state)
        
        # 描画コマンド確認
        commands = self.canvas_view.draw_commands
        assert len(commands) > 0, "描画コマンドが生成されていません"
        
        # 必須コマンドの存在確認
        command_types = [cmd['command'] for cmd in commands]
        assert 'clear' in command_types, "画面クリアコマンドが含まれていません"
        assert 'draw_circle' in command_types, "ボール描画コマンドが含まれていません"
        assert 'draw_rectangle' in command_types, "ラケット描画コマンドが含まれていません"
        assert 'draw_text' in command_types, "テキスト描画コマンドが含まれていません"
    
    def test_javascript_interface_integration(self):
        """JavaScript連携インターフェース統合テスト"""
        # フレーム更新実行
        frame_updated = self.web_controller.update_game_frame()
        assert frame_updated == True, "フレーム更新が実行されませんでした"
        
        # JavaScript連携データ取得
        js_interface_data = self.web_controller.get_javascript_interface()
        interface_data = json.loads(js_interface_data)
        
        # データ構造確認
        required_keys = ['canvas_data', 'sound_commands', 'controller_stats', 'frame_count', 'is_running', 'target_fps']
        for key in required_keys:
            assert key in interface_data, f"JavaScript連携データに{key}が含まれていません"
        
        # コントローラー統計の確認
        stats = interface_data['controller_stats']
        assert 'fps' in stats, "FPS情報が含まれていません"
        assert 'score' in stats, "スコア情報が含まれていません"
        assert 'balls_count' in stats, "ボール数情報が含まれていません"
    
    def test_sound_commands_integration(self):
        """サウンドコマンド統合テスト"""
        # サウンド再生テスト
        self.sound_view.play_sound('hit')
        self.sound_view.play_sound('wall')
        
        # サウンドコマンド取得
        sound_commands_json = self.sound_view.get_sound_commands_json()
        sound_commands = json.loads(sound_commands_json)
        
        # コマンド確認
        assert len(sound_commands) == 2, f"サウンドコマンド数が不正確: {len(sound_commands)}"
        assert sound_commands[0]['type'] == 'hit', "ヒットサウンドコマンドが正しくありません"
        assert sound_commands[1]['type'] == 'wall', "壁サウンドコマンドが正しくありません"
        
        # 送信後のクリア確認
        second_call = self.sound_view.get_sound_commands_json()
        assert second_call == "[]", "サウンドコマンドが送信後クリアされていません"
    
    def test_web_physics_integration(self):
        """Web環境物理演算統合テスト"""
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
        
        # Web Controllerを通じたフレーム更新テスト
        frame_count_before = self.web_controller.frame_count
        self.web_controller.update_game_frame()
        assert self.web_controller.frame_count > frame_count_before, "Web Controllerのフレームカウントが更新されていません"
    
    def test_web_error_handling(self):
        """Web環境エラーハンドリングテスト"""
        # 不正なマウス座標でのエラーハンドリング
        try:
            self.web_controller.handle_mouse_motion(-100.0)  # 負の座標
            # エラーが適切に処理され、例外で停止しないことを確認
            assert True, "不正座標が適切に処理されました"
        except Exception as e:
            pytest.fail(f"エラーハンドリングが不適切: {str(e)}")
        
        # 不正なキーコードでのエラーハンドリング
        try:
            self.web_controller.handle_key_press("InvalidKey")
            assert True, "不正キーコードが適切に処理されました"
        except Exception as e:
            pytest.fail(f"キーハンドリングが不適切: {str(e)}")


class TestWebEnvironmentCompatibility:
    """Web環境互換性テスト"""
    
    def test_json_serialization(self):
        """JSON シリアライゼーションテスト"""
        # PygameGameStateのWeb環境対応確認
        game_state = PygameGameState()
        
        # 状態スナップショット取得
        state_snapshot = game_state.get_state_snapshot()
        
        # JSON変換テスト
        try:
            json_data = json.dumps(state_snapshot, ensure_ascii=False)
            restored_data = json.loads(json_data)
            
            assert restored_data['is_gameover'] == game_state.is_gameover, "JSON変換でゲーム状態が失われました"
            assert len(restored_data['balls']) == len(game_state.balls), "JSON変換でボール情報が失われました"
            
        except Exception as e:
            pytest.fail(f"JSON変換失敗: {str(e)}")
    
    def test_web_color_compatibility(self):
        """Web色互換性テスト"""
        canvas_view = WebCanvasView("test", 640, 480)
        
        # 様々なRGB値のCSS変換テスト
        test_colors = [
            (255, 0, 0),    # 赤
            (0, 255, 0),    # 緑
            (0, 0, 255),    # 青
            (255, 255, 255), # 白
            (0, 0, 0),      # 黒
            (128, 64, 192)  # 紫
        ]
        
        for rgb in test_colors:
            css_color = canvas_view._rgb_to_css_color(rgb)
            assert css_color.startswith("rgb("), f"CSS色形式が不正確: {css_color}"
            assert css_color.endswith(")"), f"CSS色形式が不正確: {css_color}"
    
    def test_pyodide_compatibility(self):
        """Pyodide互換性テスト"""
        # Python 3.12機能テスト（Pyodide環境対応確認）
        import sys
        
        # バージョン確認
        assert sys.version_info >= (3, 6), f"Python バージョンが古すぎます: {sys.version}"
        
        # match文テスト（Python 3.10+対応確認）
        test_value = "web"
        match test_value:
            case "web":
                result = "web_matched"
            case _:
                result = "no_match"
        
        assert result == "web_matched", "match文がPyodide環境で動作していません"
        
        # 型ヒントテスト
        ball: PygameBall = PygameBall(100.0, 200.0, 5.0, -5.0, 10, (255, 0, 0))
        assert isinstance(ball, PygameBall), "型ヒントがPyodide環境で正しく動作していません"