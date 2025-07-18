"""
週替わりチャレンジとゲームエンジンの統合
"""

import threading
import asyncio
from typing import Dict, Any, Optional
from websocket_server import GameWebSocketServer, start_server

class ChallengeGameIntegration:
    """ゲームエンジンと週替わりチャレンジシステムを統合するクラス"""
    
    def __init__(self, game_engine):
        self.game_engine = game_engine
        self.websocket_server: Optional[GameWebSocketServer] = None
        self.server_thread: Optional[threading.Thread] = None
        self.current_challenge: Optional[Dict[str, Any]] = None
        self.event_loop: Optional[asyncio.AbstractEventLoop] = None
        
    def start_websocket_server(self, host="localhost", port=8765):
        """WebSocketサーバーを別スレッドで起動"""
        def run_server():
            # 新しいイベントループを作成
            self.event_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.event_loop)
            
            # WebSocketサーバーを作成
            self.websocket_server = GameWebSocketServer(self.game_engine)
            
            # サーバーを実行
            self.event_loop.run_until_complete(
                start_server(host, port, self.game_engine)
            )
            
        self.server_thread = threading.Thread(target=run_server, daemon=True)
        self.server_thread.start()
        
        # サーバーが起動するまで待機
        import time
        time.sleep(1)
        
    def stop_websocket_server(self):
        """WebSocketサーバーを停止"""
        if self.event_loop:
            self.event_loop.call_soon_threadsafe(self.event_loop.stop)
            
        if self.server_thread:
            self.server_thread.join(timeout=5)
            
    def apply_challenge(self, challenge_data: Dict[str, Any]):
        """チャレンジをゲームエンジンに適用"""
        self.current_challenge = challenge_data
        
        # ゲーム修飾子を適用
        modifiers = challenge_data.get("gameModifiers", {})
        
        # ボール速度修飾子
        if "ballSpeedMultiplier" in modifiers:
            self.game_engine.ball_speed_multiplier = modifiers["ballSpeedMultiplier"]
            
        # パドルサイズ修飾子
        if "paddleSizeMultiplier" in modifiers:
            self.game_engine.paddle_size_multiplier = modifiers["paddleSizeMultiplier"]
            
        # 重力修飾子
        if "gravityEnabled" in modifiers:
            self.game_engine.gravity_enabled = modifiers["gravityEnabled"]
            
        # パワーアップ頻度修飾子
        if "powerUpFrequency" in modifiers:
            self.game_engine.powerup_frequency = modifiers["powerUpFrequency"]
            
    def on_game_start(self):
        """ゲーム開始時のコールバック"""
        if self.websocket_server:
            self.websocket_server.notify_game_started()
            
    def on_game_end(self, final_stats: Dict[str, Any]):
        """ゲーム終了時のコールバック"""
        if self.websocket_server:
            # チャレンジ評価用の統計情報を追加
            if self.current_challenge:
                final_stats["challengeId"] = self.current_challenge.get("id")
                final_stats["challengeType"] = self.current_challenge.get("type")
                
            self.websocket_server.notify_game_ended(final_stats)
            
    def on_score_update(self, score: int):
        """スコア更新時のコールバック"""
        # WebSocketサーバーが自動的に処理
        pass
        
    def on_ball_hit(self, hit_data: Dict[str, Any]):
        """ボールヒット時のコールバック"""
        if self.websocket_server:
            self.websocket_server.notify_ball_hit(hit_data)
            
    def on_powerup_collected(self, powerup_type: str):
        """パワーアップ収集時のコールバック"""
        if self.websocket_server:
            self.websocket_server.notify_powerup_collected({
                "type": powerup_type,
                "timestamp": self.game_engine.get_game_time()
            })

# ゲームエンジンの拡張例
class ChallengeAwareGameEngine:
    """チャレンジ対応のゲームエンジン"""
    
    def __init__(self, base_engine):
        self.base_engine = base_engine
        self.integration = ChallengeGameIntegration(self)
        
        # チャレンジ用の修飾子
        self.ball_speed_multiplier = 1.0
        self.paddle_size_multiplier = 1.0
        self.gravity_enabled = False
        self.powerup_frequency = 1.0
        
        # 統計情報
        self.balls_hit = 0
        self.power_ups_collected = 0
        
    def start(self):
        """ゲームを開始"""
        # WebSocketサーバーを起動
        self.integration.start_websocket_server()
        
        # ゲーム開始を通知
        self.integration.on_game_start()
        
        # 基本エンジンを開始
        self.base_engine.start()
        
    def stop(self):
        """ゲームを停止"""
        # 最終統計を収集
        final_stats = {
            "score": self.get_score(),
            "ballsHit": self.balls_hit,
            "powerUpsCollected": self.power_ups_collected,
            "gameTime": self.get_game_time()
        }
        
        # ゲーム終了を通知
        self.integration.on_game_end(final_stats)
        
        # 基本エンジンを停止
        self.base_engine.stop()
        
        # WebSocketサーバーを停止
        self.integration.stop_websocket_server()
        
    def get_state(self) -> Dict[str, Any]:
        """現在のゲーム状態を取得"""
        base_state = self.base_engine.get_state() if hasattr(self.base_engine, 'get_state') else {}
        
        return {
            **base_state,
            "score": self.get_score(),
            "balls_hit": self.balls_hit,
            "power_ups_collected": self.power_ups_collected,
            "game_time": self.get_game_time(),
            "ball_speed_multiplier": self.ball_speed_multiplier,
            "paddle_size_multiplier": self.paddle_size_multiplier,
            "gravity_enabled": self.gravity_enabled,
            "powerup_frequency": self.powerup_frequency
        }
        
    def get_score(self) -> int:
        """現在のスコアを取得"""
        return getattr(self.base_engine, 'score', 0)
        
    def get_game_time(self) -> float:
        """ゲーム経過時間を取得"""
        return getattr(self.base_engine, 'game_time', 0.0)
        
    def on_ball_hit(self):
        """ボールがヒットしたときの処理"""
        self.balls_hit += 1
        self.integration.on_ball_hit({
            "count": self.balls_hit,
            "timestamp": self.get_game_time()
        })
        
    def on_powerup_collected(self, powerup_type: str):
        """パワーアップを収集したときの処理"""
        self.power_ups_collected += 1
        self.integration.on_powerup_collected(powerup_type)