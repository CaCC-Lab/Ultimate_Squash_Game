"""
WebSocket Server for Python-JavaScript Bridge
週替わりチャレンジシステムとゲームエンジンの連携
"""

import asyncio
import websockets
import json
import logging
import hmac
import hashlib
import secrets
import os
from typing import Set, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthStatus(Enum):
    """認証ステータス"""
    PENDING = "pending"
    AUTHENTICATED = "authenticated"
    FAILED = "failed"

@dataclass
class ClientSession:
    """クライアントセッション情報"""
    websocket: websockets.WebSocketServerProtocol
    auth_status: AuthStatus = AuthStatus.PENDING
    auth_token: Optional[str] = None
    connected_at: datetime = None
    last_activity: datetime = None
    
    def __post_init__(self):
        self.connected_at = datetime.now()
        self.last_activity = datetime.now()

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
    def __init__(self, game_engine=None, auth_enabled=True):
        self.sessions: Dict[websockets.WebSocketServerProtocol, ClientSession] = {}
        self.game_engine = game_engine
        self.game_state = GameState()
        self.current_challenge = None
        self.auth_enabled = auth_enabled
        self.server_secret = os.environ.get('WS_SERVER_SECRET', secrets.token_hex(32))
        self.auth_timeout = 30  # 認証タイムアウト（秒）
        
    async def register(self, websocket):
        """新しいクライアントを登録"""
        session = ClientSession(websocket=websocket)
        self.sessions[websocket] = session
        logger.info(f"Client connected. Total clients: {len(self.sessions)}")
        
        if self.auth_enabled:
            # 認証要求を送信
            await self.send_to_client(websocket, "auth:required", {
                "message": "Authentication required",
                "timeout": self.auth_timeout
            })
            # 認証タイムアウトを設定
            asyncio.create_task(self._auth_timeout_handler(websocket))
        else:
            # 認証無効時は自動的に認証済みとする
            session.auth_status = AuthStatus.AUTHENTICATED
            await self.send_to_client(websocket, "game:state", self.game_state.to_dict())
        
    async def unregister(self, websocket):
        """クライアントを登録解除"""
        if websocket in self.sessions:
            del self.sessions[websocket]
            logger.info(f"Client disconnected. Total clients: {len(self.sessions)}")
        
    async def send_to_client(self, websocket, event_type: str, payload: Dict[str, Any]):
        """特定のクライアントにメッセージを送信"""
        message = json.dumps({
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now().isoformat()
        })
        await websocket.send(message)
        
    async def broadcast(self, event_type: str, payload: Dict[str, Any], auth_required=True):
        """認証済みクライアントにメッセージをブロードキャスト"""
        if self.sessions:
            message = json.dumps({
                "type": event_type,
                "payload": payload,
                "timestamp": datetime.now().isoformat()
            })
            
            # 認証済みクライアントのみに送信
            authenticated_clients = [
                session.websocket 
                for session in self.sessions.values() 
                if not auth_required or session.auth_status == AuthStatus.AUTHENTICATED
            ]
            
            if authenticated_clients:
                await asyncio.gather(
                    *[client.send(message) for client in authenticated_clients],
                    return_exceptions=True
                )
            
    async def handle_message(self, websocket, message: str):
        """クライアントからのメッセージを処理"""
        try:
            data = json.loads(message)
            event_type = data.get("type")
            payload = data.get("payload", {})
            
            session = self.sessions.get(websocket)
            if not session:
                return
            
            # アクティビティを更新
            session.last_activity = datetime.now()
            
            logger.info(f"Received message: {event_type}")
            
            # 認証処理
            if event_type == "auth:token":
                await self._handle_auth(websocket, payload)
                return
            
            # 認証が必要な場合はチェック
            if self.auth_enabled and session.auth_status != AuthStatus.AUTHENTICATED:
                await self.send_to_client(websocket, "error", {
                    "message": "Authentication required",
                    "code": "AUTH_REQUIRED"
                })
                return
            
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
    
    async def _handle_auth(self, websocket, auth_data: Dict[str, Any]):
        """認証処理"""
        session = self.sessions.get(websocket)
        if not session:
            return
        
        token = auth_data.get("token")
        timestamp = auth_data.get("timestamp")
        signature = auth_data.get("signature")
        
        if not all([token, timestamp, signature]):
            session.auth_status = AuthStatus.FAILED
            await self.send_to_client(websocket, "auth:failed", {
                "message": "Missing authentication data"
            })
            return
        
        # タイムスタンプの検証（5分以内）
        try:
            auth_time = datetime.fromisoformat(timestamp)
            if abs((datetime.now() - auth_time).total_seconds()) > 300:
                raise ValueError("Timestamp too old")
        except (ValueError, TypeError):
            session.auth_status = AuthStatus.FAILED
            await self.send_to_client(websocket, "auth:failed", {
                "message": "Invalid timestamp"
            })
            return
        
        # 署名の検証
        expected_signature = hmac.new(
            self.server_secret.encode(),
            f"{token}:{timestamp}".encode(),
            hashlib.sha256
        ).hexdigest()
        
        if hmac.compare_digest(signature, expected_signature):
            session.auth_status = AuthStatus.AUTHENTICATED
            session.auth_token = token
            await self.send_to_client(websocket, "auth:success", {
                "message": "Authentication successful"
            })
            # 認証成功後、ゲーム状態を送信
            await self.send_to_client(websocket, "game:state", self.game_state.to_dict())
        else:
            session.auth_status = AuthStatus.FAILED
            await self.send_to_client(websocket, "auth:failed", {
                "message": "Invalid signature"
            })
    
    async def _auth_timeout_handler(self, websocket):
        """認証タイムアウト処理"""
        await asyncio.sleep(self.auth_timeout)
        
        session = self.sessions.get(websocket)
        if session and session.auth_status == AuthStatus.PENDING:
            logger.warning(f"Authentication timeout for client")
            await self.send_to_client(websocket, "auth:timeout", {
                "message": "Authentication timeout"
            })
            await websocket.close()
            
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

async def start_server(host="localhost", port=8765, game_engine=None, auth_enabled=None):
    """WebSocketサーバーを起動（ポート競合チェック付き）"""
    # 環境変数から認証設定を読み込み
    if auth_enabled is None:
        auth_enabled = os.environ.get('WS_AUTH_ENABLED', 'true').lower() == 'true'
    
    server = GameWebSocketServer(game_engine, auth_enabled=auth_enabled)
    
    # ポート競合チェック
    import socket
    for attempt_port in range(port, port + 10):  # 10ポート範囲で試行
        try:
            # ポートが使用可能かチェック
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((host, attempt_port))
            
            # ゲームループを開始
            asyncio.create_task(server.game_loop())
            
            # WebSocketサーバーを開始
            start_server_coro = websockets.serve(server.handle_client, host, attempt_port)
            
            await start_server_coro
            logger.info(f"WebSocket server started on ws://{host}:{attempt_port}")
            
            # ポート情報をファイルに保存（テスト用）
            with open("websocket_port.txt", "w") as f:
                f.write(str(attempt_port))
            
            await asyncio.Future()  # 永続的に実行
            
        except OSError as e:
            if attempt_port == port + 9:  # 最後の試行
                logger.error(f"All ports {port}-{port+9} are in use")
                raise e
            else:
                logger.warning(f"Port {attempt_port} is in use, trying next port...")
                continue

# スタンドアロン実行用
if __name__ == "__main__":
    asyncio.run(start_server())