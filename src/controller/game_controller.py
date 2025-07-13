"""
ゲーム制御Controller（Controller層）

個人開発規約遵守:
- TDD必須: テストファーストで開発されたController
- モック禁止: 実際のGameStateとGameViewを操作
- エラー3要素: Controller操作時のエラーハンドリング
"""

import tkinter as tk


class GameController:
    """
    ゲーム制御コントローラー（MVCパターンのController）
    ユーザー入力とModel-View間の協調を管理
    """
    
    def __init__(self, game_state, game_view, root_window):
        """
        Controllerの初期化
        
        Args:
            game_state: GameState - ゲーム状態Model
            game_view: GameView - ゲーム描画View
            root_window: tkinter.Tk - メインウィンドウ
        """
        self.game_state = game_state
        self.game_view = game_view
        self.root = root_window
        
        # Model-View連携のためのObserverパターン設定
        self._setup_observer_pattern()
        
        # tkinterイベントのバインド設定
        self._bind_events()
        
        # ゲームループ管理用
        self.is_running = False
        self.frame_delay = 50  # ミリ秒
    
    def _setup_observer_pattern(self):
        """
        ObserverパターンによるModel-View連携設定
        GameViewをGameStateのObserverとして登録
        """
        try:
            self.game_state.add_observer(self.game_view)
        except Exception as e:
            # エラー3要素に従ったエラーハンドリング
            error_msg = {
                'what': "Observer登録に失敗しました",
                'why': f"GameStateまたはGameViewの初期化エラー: {str(e)}",
                'how': "GameStateとGameViewが正しく初期化されているか確認してください"
            }
            raise ControllerError(f"{error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def _bind_events(self):
        """tkinterイベントのバインド設定"""
        try:
            # マウス移動: ラケット位置制御
            self.root.bind('<Motion>', self._on_mouse_motion)
            
            # クリック: ゲームリセット
            self.root.bind('<Button-1>', self._on_click)
            
            # スペースキー: ポーズ切り替え
            self.root.bind('<space>', self._on_pause_toggle)
            
            # フォーカス設定（キー入力受信のため）
            self.root.focus_set()
            
        except Exception as e:
            error_msg = {
                'what': "イベントバインドに失敗しました",
                'why': f"tkinterイベント設定エラー: {str(e)}",
                'how': "root_windowが有効なtkinter.Tkインスタンスか確認してください"
            }
            raise ControllerError(f"{error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    
    def _on_mouse_motion(self, event):
        """マウス移動イベント処理"""
        try:
            # ゲーム中のみラケット位置を更新
            if not self.game_state.is_gameover and not self.game_state.paused:
                # X座標をラケット位置に反映（画面内制限も GameState で処理）
                self.game_state.update_racket_position(event.x)
                
        except Exception as e:
            self._handle_controller_error("マウス移動処理", e)
    
    def _on_click(self, event):
        """クリックイベント処理"""
        try:
            # ゲームリセット
            self.game_state.reset_game()
            
        except Exception as e:
            self._handle_controller_error("クリック処理", e)
    
    def _on_pause_toggle(self, event):
        """ポーズ切り替えイベント処理"""
        try:
            self.game_state.toggle_pause()
            
            # ウィンドウタイトルも更新
            if self.game_state.paused:
                self.root.title("Game Paused - Ultimate Squash Game")
            else:
                self.root.title("Ultimate Squash Game")
                
        except Exception as e:
            self._handle_controller_error("ポーズ切り替え処理", e)
    
    def handle_mouse_motion(self, x_position):
        """
        マウス移動処理（テスト用インターフェース）
        
        Args:
            x_position: int - マウスX座標
        """
        try:
            if not self.game_state.is_gameover and not self.game_state.paused:
                self.game_state.update_racket_position(x_position)
        except Exception as e:
            self._handle_controller_error("マウス移動処理（テスト用）", e)
    
    def handle_click(self):
        """クリック処理（テスト用インターフェース）"""
        try:
            self.game_state.reset_game()
        except Exception as e:
            self._handle_controller_error("クリック処理（テスト用）", e)
    
    def handle_pause_toggle(self):
        """ポーズ切り替え処理（テスト用インターフェース）"""
        try:
            self.game_state.toggle_pause()
        except Exception as e:
            self._handle_controller_error("ポーズ切り替え処理（テスト用）", e)
    
    def start_game_loop(self):
        """ゲームループの開始"""
        if not self.is_running:
            self.is_running = True
            self._game_loop()
    
    def stop_game_loop(self):
        """ゲームループの停止"""
        self.is_running = False
    
    def _game_loop(self):
        """内部ゲームループ処理"""
        if not self.is_running:
            return
            
        try:
            # ゲーム状態の更新（Modelの責務）
            if not self.game_state.paused:
                self.game_state.update_frame()
            
            # 次フレームのスケジューリング
            self.root.after(self.frame_delay, self._game_loop)
            
        except Exception as e:
            self._handle_controller_error("ゲームループ処理", e)
            # 致命的エラーの場合はゲームループを停止
            self.stop_game_loop()
    
    def update_game_frame(self):
        """
        ゲームフレーム更新（テスト用インターフェース）
        1回のフレーム更新のみ実行
        """
        try:
            if not self.game_state.paused:
                self.game_state.update_frame()
        except Exception as e:
            self._handle_controller_error("フレーム更新処理", e)
    
    def run_single_frame(self):
        """
        単一フレーム実行（テスト用インターフェース）
        テストでの検証に使用
        """
        try:
            if not self.game_state.paused and not self.game_state.is_gameover:
                self.game_state.update_frame()
        except Exception as e:
            self._handle_controller_error("単一フレーム実行", e)
    
    def trigger_score_update(self):
        """
        スコア更新のトリガー（テスト用インターフェース）
        Observer動作確認用
        """
        try:
            # 成功ヒットを発生させてObserver通知をテスト
            self.game_state._handle_successful_hit()
        except Exception as e:
            self._handle_controller_error("スコア更新処理", e)
    
    def handle_invalid_operation(self):
        """
        無効な操作処理（テスト用インターフェース）
        エラーハンドリング検証用
        """
        # 意図的にエラーを発生させる
        raise ControllerError(
            "無効な操作が実行されました - "
            "サポートされていない操作です - "
            "有効な操作（マウス移動、クリック、スペースキー）を使用してください"
        )
    
    def _handle_controller_error(self, operation, error):
        """
        Controller操作エラーの統一ハンドリング（エラー3要素対応）
        
        Args:
            operation: str - 実行していた操作名
            error: Exception - 発生したエラー
        """
        error_msg = {
            'what': f"{operation}中にエラーが発生しました",
            'why': f"内部処理エラー: {str(error)}",
            'how': "ゲームを再起動してください。問題が続く場合は開発者に連絡してください"
        }
        
        # エラーログ出力（3要素形式）
        full_error_msg = f"{error_msg['what']} - {error_msg['why']} - {error_msg['how']}"
        print(f"Controller Error: {full_error_msg}")
        
        # 重大なエラーの場合は再発生
        if "critical" in str(error).lower():
            raise ControllerError(full_error_msg)


class ControllerError(Exception):
    """Controller層固有のエラークラス"""
    
    def __init__(self, message):
        super().__init__(message)
        self.message = message
    
    def __str__(self):
        return f"ControllerError: {self.message}"