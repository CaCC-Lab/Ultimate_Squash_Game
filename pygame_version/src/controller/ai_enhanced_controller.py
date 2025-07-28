"""
AI強化ゲームコントローラー（AI統合Controller層）

個人開発規約遵守:
- TDD必須: AI統合のテスト
- モック禁止: 実際のOllama APIでテスト
- エラー3要素: AI処理時のエラーハンドリング検証

技術移行:
- 非同期AI処理の統合
- Observerパターンでのイベント通知
- リアルタイムゲームコメンタリー
"""

import pygame
import asyncio
import threading
from typing import Optional, Dict, Any
from queue import Queue, Empty
from src.controller.pygame_game_controller import PygameGameController
from src.model.pygame_game_state import PygameGameState
from src.view.pygame_game_view import PygameGameView, PygameSoundView


class AIEnhancedController(PygameGameController):
    """
    AI機能を統合した強化版ゲームコントローラー
    
    責務:
    - ゲームイベントのAI処理への通知
    - 非同期AIレスポンスの管理
    - AI Dynamic Adjustment (ADA)の実装
    - リアルタイムコメンタリーの表示
    """
    
    def __init__(self, 
                 game_state: PygameGameState, 
                 game_view: PygameGameView,
                 sound_view: Optional[PygameSoundView] = None,
                 target_fps: int = 60,
                 ai_enabled: bool = True):
        """
        AI強化コントローラーの初期化
        
        Args:
            game_state: PygameGameState - 管理するゲーム状態
            game_view: PygameGameView - 管理するゲームビュー  
            sound_view: PygameSoundView - サウンドビュー（オプション）
            target_fps: int - 目標FPS
            ai_enabled: bool - AI機能の有効/無効
        """
        # 親クラスの初期化
        super().__init__(game_state, game_view, sound_view, target_fps)
        
        # AI機能の設定
        self.ai_enabled = ai_enabled
        self.ai_enhancer = None
        self.ai_manager = None
        
        # 非同期処理用
        self.ai_response_queue = Queue(maxsize=10)
        self.ai_thread = None
        self.ai_loop = None
        
        # ADA (AI Dynamic Adjustment) パラメータ
        self.ada_enabled = True
        self.miss_count = 0
        self.hit_count = 0
        self.evaluation_window = 10  # 評価ウィンドウ（ヒット+ミス）
        self.current_difficulty_modifier = 1.0
        
        # AI統合の初期化
        if self.ai_enabled:
            self._initialize_ai_components()
    
    def _initialize_ai_components(self):
        """AI機能の初期化"""
        try:
            # 非同期イベントループを別スレッドで実行
            self.ai_thread = threading.Thread(target=self._run_ai_loop, daemon=True)
            self.ai_thread.start()
            
            # AI初期化を待機（最大3秒）
            import time
            for _ in range(30):
                if self.ai_enhancer is not None:
                    print("AI機能の初期化が完了しました")
                    return
                time.sleep(0.1)
            
            print("AI機能の初期化がタイムアウトしました - AI機能なしで続行")
            self.ai_enabled = False
            
        except Exception as e:
            error_msg = {
                'what': "AI機能の初期化に失敗しました",
                'why': f"AI初期化でエラーが発生: {str(e)}",
                'how': "AI機能なしでゲームを続行します"
            }
            print(f"AI初期化エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            self.ai_enabled = False
    
    def _run_ai_loop(self):
        """AI用の非同期イベントループ実行"""
        try:
            # 新しいイベントループを作成
            self.ai_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.ai_loop)
            
            # AI機能を非同期で初期化
            self.ai_loop.run_until_complete(self._async_initialize_ai())
            
            # イベントループを実行
            self.ai_loop.run_forever()
            
        except Exception as e:
            print(f"AIイベントループエラー: {str(e)}")
            self.ai_enabled = False
    
    async def _async_initialize_ai(self):
        """非同期AI初期化"""
        try:
            # Ollama接続を確認してからインポート
            import subprocess
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception("Ollamaが起動していません")
            
            # AI機能をインポート（Gemma対応版を優先）
            try:
                from src.ai.gemma_enhancer import GemmaGameEnhancer, AIGameModeManager
                self.ai_enhancer = GemmaGameEnhancer()
            except ImportError:
                from src.ai.enhancer import OllamaGameEnhancer, AIGameModeManager
                self.ai_enhancer = OllamaGameEnhancer()
            
            # AI機能の初期化
            success = await self.ai_enhancer.initialize()
            
            if success:
                self.ai_manager = AIGameModeManager(self.ai_enhancer)
                print("AI機能が正常に初期化されました")
            else:
                raise Exception("AI初期化に失敗しました")
                
        except Exception as e:
            print(f"AI初期化エラー: {str(e)}")
            self.ai_enabled = False
            self.ai_enhancer = None
            self.ai_manager = None
    
    def _notify_ai_event(self, event_type: str, event_data: Dict[str, Any]):
        """
        AI機能にゲームイベントを通知
        
        Args:
            event_type: str - イベントタイプ（hit, miss, score等）
            event_data: Dict - イベントデータ
        """
        if not self.ai_enabled or not self.ai_loop:
            return
        
        try:
            # 非同期タスクをスケジュール
            asyncio.run_coroutine_threadsafe(
                self._async_process_event(event_type, event_data),
                self.ai_loop
            )
        except Exception as e:
            print(f"AIイベント通知エラー: {str(e)}")
    
    async def _async_process_event(self, event_type: str, event_data: Dict[str, Any]):
        """非同期でAIイベントを処理"""
        try:
            # AIコメンタリーを生成
            if event_type == "paddle_hit":
                response = await self.ai_enhancer.generate_commentary(
                    f"ラケットがボールを打ち返しました。速度: {event_data.get('speed', 0):.1f}"
                )
                self._queue_ai_response("commentary", response)
                
            elif event_type == "miss":
                response = await self.ai_enhancer.generate_commentary(
                    f"ボールを打ち返せませんでした。現在のスコア: {event_data.get('score', 0)}"
                )
                self._queue_ai_response("commentary", response)
                
            elif event_type == "wall_hit":
                # 壁ヒットは頻繁なのでコメント頻度を制限
                import random
                if random.random() < 0.1:  # 10%の確率でコメント
                    response = await self.ai_enhancer.generate_commentary(
                        "ボールが壁に当たりました"
                    )
                    self._queue_ai_response("commentary", response)
                    
        except Exception as e:
            print(f"AIイベント処理エラー: {str(e)}")
    
    def _queue_ai_response(self, response_type: str, response_data: Any):
        """AIレスポンスをキューに追加"""
        try:
            self.ai_response_queue.put_nowait({
                'type': response_type,
                'data': response_data,
                'timestamp': pygame.time.get_ticks()
            })
        except:
            # キューが満杯の場合は古いレスポンスを破棄
            try:
                self.ai_response_queue.get_nowait()
                self.ai_response_queue.put_nowait({
                    'type': response_type,
                    'data': response_data,
                    'timestamp': pygame.time.get_ticks()
                })
            except:
                pass
    
    def _process_ai_responses(self):
        """AIレスポンスを処理（メインスレッドで実行）"""
        try:
            while True:
                response = self.ai_response_queue.get_nowait()
                
                if response['type'] == 'commentary':
                    # コメンタリーをビューに表示
                    if hasattr(self.game_view, 'show_ai_commentary'):
                        self.game_view.show_ai_commentary(response['data'])
                    else:
                        print(f"AI: {response['data']}")
                        
        except Empty:
            pass
    
    def _update_ada_system(self, is_hit: bool):
        """
        ADA (AI Dynamic Adjustment) システムの更新
        
        Args:
            is_hit: bool - ヒット成功（True）またはミス（False）
        """
        if not self.ada_enabled:
            return
        
        # ヒット/ミスをカウント
        if is_hit:
            self.hit_count += 1
        else:
            self.miss_count += 1
        
        # 評価ウィンドウに達したら難易度調整
        total_attempts = self.hit_count + self.miss_count
        if total_attempts >= self.evaluation_window:
            miss_ratio = self.miss_count / total_attempts
            
            # 難易度調整
            if miss_ratio > 0.3:  # ミス率30%以上
                # 速度を20%減少
                self.current_difficulty_modifier *= 0.8
                self._apply_difficulty_adjustment()
                print(f"ADA: 難易度を下げました（ミス率: {miss_ratio:.1%}）")
                
            elif miss_ratio < 0.1:  # ミス率10%未満  
                # 速度を15%増加
                self.current_difficulty_modifier *= 1.15
                self._apply_difficulty_adjustment()
                print(f"ADA: 難易度を上げました（ミス率: {miss_ratio:.1%}）")
            
            # カウンターをリセット
            self.hit_count = 0
            self.miss_count = 0
    
    def _apply_difficulty_adjustment(self):
        """難易度調整を適用"""
        # 難易度倍率を制限（0.5倍〜2.0倍）
        self.current_difficulty_modifier = max(0.5, min(2.0, self.current_difficulty_modifier))
        
        # ボールの速度を調整
        for ball in self.game_state.balls:
            base_speed = 5.0  # 基本速度
            adjusted_speed = base_speed * self.current_difficulty_modifier
            
            # 速度ベクトルを正規化して新しい速度を適用
            import math
            speed = math.sqrt(ball.dx**2 + ball.dy**2)
            if speed > 0:
                ball.dx = (ball.dx / speed) * adjusted_speed
                ball.dy = (ball.dy / speed) * adjusted_speed
    
    def update_game_frame(self):
        """
        1フレーム分のゲーム更新（AI機能付き）
        """
        # AIレスポンスを処理
        if self.ai_enabled:
            self._process_ai_responses()
        
        # 親クラスのゲーム更新
        super().update_game_frame()
        
        # ゲーム状態に基づいてAIイベントを生成
        if not self.game_state.paused and not self.game_state.is_gameover:
            for ball in self.game_state.balls:
                # ボールの位置に基づいてイベントを検出
                # （実際のイベント検出はgame_stateで行われるべき）
                pass
    
    def handle_collision(self, collision_type: str, collision_data: Dict[str, Any]):
        """
        衝突イベントの処理（AI通知付き）
        
        Args:
            collision_type: str - 衝突タイプ（paddle, wall, miss等）
            collision_data: Dict - 衝突データ
        """
        # AI通知
        self._notify_ai_event(collision_type, collision_data)
        
        # ADAシステム更新
        if collision_type == "paddle_hit":
            self._update_ada_system(True)
        elif collision_type == "miss":
            self._update_ada_system(False)
    
    def cleanup(self):
        """リソースクリーンアップ（AI機能含む）"""
        # AIループを停止
        if self.ai_loop:
            self.ai_loop.call_soon_threadsafe(self.ai_loop.stop)
        
        # AIスレッドの終了を待機
        if self.ai_thread and self.ai_thread.is_alive():
            self.ai_thread.join(timeout=1.0)
        
        # 親クラスのクリーンアップ
        super().cleanup()
    
    def get_game_statistics(self) -> dict:
        """ゲーム統計情報取得（AI情報付き）"""
        stats = super().get_game_statistics()
        
        # AI関連の統計を追加
        stats.update({
            'ai_enabled': self.ai_enabled,
            'ada_enabled': self.ada_enabled,
            'difficulty_modifier': self.current_difficulty_modifier,
            'hit_count': self.hit_count,
            'miss_count': self.miss_count,
            'miss_ratio': self.miss_count / max(1, self.hit_count + self.miss_count)
        })
        
        return stats