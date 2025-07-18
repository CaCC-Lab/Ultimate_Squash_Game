"""
WebSocket Server for Python-JavaScript Bridge
週替わりチャレンジシステムとゲームエンジンの連携
"""

import asyncio
import websockets
import json
import logging
from typing import Set, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GameState:
    """ゲーム状態を管理するクラス"""
    score: int = 0
    balls_hit: int = 0
    power_ups_collected: int = 0
    game_time: float = 0.0
    is_playing: bool = False
    challenge_active: bool = False
    challenge_modifiers: Dict[str, Any] = None

    def to_dict(self):
        return asdict(self)

class GameWebSocketServer:
    def __init__(self, game_engine=None):
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.game_engine = game_engine
        self.game_state = GameState()
        self.current_challenge = None
        
    async def register(self, websocket):
        """新しいクライアントを登録"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
        # 現在のゲーム状態を送信
        await self.send_to_client(websocket, "game:state", self.game_state.to_dict())
        
    async def unregister(self, websocket):
        """クライアントを登録解除"""
        self.clients.remove(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
        
    async def send_to_client(self, websocket, event_type: str, payload: Dict[str, Any]):
        """特定のクライアントにメッセージを送信"""
        message = json.dumps({
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now().isoformat()
        })
        await websocket.send(message)
        
    async def broadcast(self, event_type: str, payload: Dict[str, Any]):
        """全クライアントにメッセージをブロードキャスト"""
        if self.clients:
            message = json.dumps({
                "type": event_type,
                "payload": payload,
                "timestamp": datetime.now().isoformat()
            })
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
            
    async def handle_message(self, websocket, message: str):
        """クライアントからのメッセージを処理"""
        try:
            data = json.loads(message)
            event_type = data.get("type")
            payload = data.get("payload", {})
            
            logger.info(f"Received message: {event_type}")
            
            # イベントタイプに応じて処理
            if event_type == "challenge:load":
                await self.load_challenge(payload)
            elif event_type == "difficulty:update":
                await self.update_difficulty(payload)
            elif event_type == "modifier:apply":
                await self.apply_modifier(payload)
            elif event_type == "game:request_state":
                await self.send_to_client(websocket, "game:state", self.game_state.to_dict())
            else:
                logger.warning(f"Unknown event type: {event_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            
    async def load_challenge(self, challenge_data: Dict[str, Any]):
        """チャレンジをロード"""
        self.current_challenge = challenge_data
        self.game_state.challenge_active = True
        self.game_state.challenge_modifiers = challenge_data.get("gameModifiers", {})
        
        # ゲームエンジンにチャレンジを適用
        if self.game_engine:
            self.game_engine.apply_challenge(challenge_data)
            
        logger.info(f"Challenge loaded: {challenge_data.get('id')}")
        await self.broadcast("challenge:loaded", challenge_data)
        
    async def update_difficulty(self, difficulty_data: Dict[str, Any]):
        """難易度を更新"""
        if self.game_engine:
            self.game_engine.set_difficulty(difficulty_data.get("level", 1))
            
        await self.broadcast("difficulty:updated", difficulty_data)
        
    async def apply_modifier(self, modifier_data: Dict[str, Any]):
        """ゲーム修飾子を適用"""
        modifier_type = modifier_data.get("type")
        value = modifier_data.get("value")
        
        if self.game_engine:
            self.game_engine.apply_modifier(modifier_type, value)
            
        await self.broadcast("modifier:applied", modifier_data)
        
    async def game_loop(self):
        """ゲームループ（ゲーム状態の更新をブロードキャスト）"""
        while True:
            if self.game_state.is_playing and self.game_engine:
                # ゲームエンジンから状態を取得
                engine_state = self.game_engine.get_state()
                
                # 状態を更新
                self.game_state.score = engine_state.get("score", 0)
                self.game_state.balls_hit = engine_state.get("balls_hit", 0)
                self.game_state.power_ups_collected = engine_state.get("power_ups_collected", 0)
                self.game_state.game_time = engine_state.get("game_time", 0.0)
                
                # スコア更新をブロードキャスト
                await self.broadcast("score:updated", {
                    "score": self.game_state.score,
                    "ballsHit": self.game_state.balls_hit,
                    "powerUpsCollected": self.game_state.power_ups_collected,
                    "gameTime": self.game_state.game_time
                })
                
            await asyncio.sleep(0.1)  # 100msごとに更新
            
    async def handle_client(self, websocket, path):
        """クライアント接続を処理"""
        await self.register(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        finally:
            await self.unregister(websocket)
            
    def notify_game_started(self):
        """ゲーム開始を通知"""
        self.game_state.is_playing = True
        asyncio.create_task(self.broadcast("game:started", self.game_state.to_dict()))
        
    def notify_game_ended(self, final_stats: Dict[str, Any]):
        """ゲーム終了を通知"""
        self.game_state.is_playing = False
        asyncio.create_task(self.broadcast("game:ended", final_stats))
        
    def notify_ball_hit(self, hit_data: Dict[str, Any]):
        """ボールヒットを通知"""
        asyncio.create_task(self.broadcast("ball:hit", hit_data))
        
    def notify_powerup_collected(self, powerup_data: Dict[str, Any]):
        """パワーアップ収集を通知"""
        asyncio.create_task(self.broadcast("powerup:collected", powerup_data))

async def start_server(host="localhost", port=8765, game_engine=None):
    """WebSocketサーバーを起動"""
    server = GameWebSocketServer(game_engine)
    
    # ゲームループを開始
    asyncio.create_task(server.game_loop())
    
    # WebSocketサーバーを開始
    async with websockets.serve(server.handle_client, host, port):
        logger.info(f"WebSocket server started on ws://{host}:{port}")
        await asyncio.Future()  # 永続的に実行

# スタンドアロン実行用
if __name__ == "__main__":
    asyncio.run(start_server())