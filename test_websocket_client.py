#!/usr/bin/env python3
"""
WebSocket Client Test
WebSocket統合ゲームエンジンとの通信テスト

個人開発規約遵守:
- TDD必須: WebSocket通信の動作確認
- モック禁止: 実際のWebSocket接続でテスト
- エラー3要素: 接続エラー時の適切なメッセージ
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WebSocketTestClient:
    def __init__(self, uri="ws://localhost:8765"):
        self.uri = uri
        self.websocket = None
        self.connected = False
        
    async def connect(self):
        """WebSocketサーバーに接続"""
        try:
            logger.info(f"WebSocketサーバーに接続中: {self.uri}")
            self.websocket = await websockets.connect(self.uri)
            self.connected = True
            logger.info("WebSocket接続が確立されました")
            return True
            
        except Exception as e:
            error_msg = {
                'what': "WebSocket接続に失敗しました",
                'why': f"接続エラー: {str(e)}",
                'how': "WebSocketサーバーが起動していることを確認してください"
            }
            logger.error(f"接続エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
    
    async def send_message(self, message_type, payload=None):
        """メッセージを送信"""
        if not self.connected or not self.websocket:
            logger.error("WebSocket接続がありません")
            return False
            
        try:
            message = {
                "type": message_type,
                "payload": payload or {},
                "timestamp": datetime.now().isoformat()
            }
            
            await self.websocket.send(json.dumps(message))
            logger.info(f"メッセージ送信: {message_type}")
            return True
            
        except Exception as e:
            logger.error(f"メッセージ送信エラー: {e}")
            return False
    
    async def receive_message(self, timeout=5.0):
        """メッセージを受信"""
        if not self.connected or not self.websocket:
            logger.error("WebSocket接続がありません")
            return None
            
        try:
            message = await asyncio.wait_for(
                self.websocket.recv(),
                timeout=timeout
            )
            
            data = json.loads(message)
            logger.info(f"メッセージ受信: {data.get('type', 'unknown')}")
            return data
            
        except asyncio.TimeoutError:
            logger.warning(f"メッセージ受信タイムアウト ({timeout}秒)")
            return None
        except Exception as e:
            logger.error(f"メッセージ受信エラー: {e}")
            return None
    
    async def receive_specific_message(self, expected_type, timeout=5.0, max_attempts=5):
        """特定のタイプのメッセージを受信（複数メッセージ対応）"""
        for attempt in range(max_attempts):
            message = await self.receive_message(timeout)
            if message:
                if message.get('type') == expected_type:
                    logger.info(f"✅ 期待されたメッセージタイプを受信: {expected_type}")
                    return message
                else:
                    logger.info(f"  -> 異なるメッセージタイプ受信: {message.get('type')} (期待: {expected_type})")
                    continue  # 次のメッセージを待つ
            else:
                logger.warning(f"  -> 試行 {attempt + 1}/{max_attempts}: メッセージなし")
                
        logger.error(f"❌ 期待されたメッセージタイプが受信できませんでした: {expected_type}")
        return None
    
    async def test_game_state_request(self):
        """ゲーム状態リクエストテスト"""
        logger.info("=== ゲーム状態リクエストテスト ===")
        
        # ゲーム状態を要求
        await self.send_message("game:request_state")
        
        # レスポンスを待機
        response = await self.receive_specific_message('game:state', timeout=3.0)
        
        if response:
            logger.info("✅ ゲーム状態取得成功")
            payload = response.get('payload', {})
            logger.info(f"スコア: {payload.get('score', 'N/A')}")
            logger.info(f"ボールヒット数: {payload.get('balls_hit', 'N/A')}")
            logger.info(f"ゲーム時間: {payload.get('game_time', 'N/A')}")
            return True
        else:
            logger.error("❌ ゲーム状態取得失敗")
            return False
    
    async def test_challenge_load(self):
        """チャレンジロードテスト"""
        logger.info("=== チャレンジロードテスト ===")
        
        challenge_data = {
            "id": "test-challenge-001",
            "name": "テストチャレンジ",
            "objectives": ["スコア100点を達成", "連続10回ヒット"],
            "gameModifiers": {
                "ballSpeed": 1.2,
                "paddleSize": 0.8,
                "scoreMultiplier": 2.0
            },
            "difficulty": 3,
            "timeLimit": 60
        }
        
        await self.send_message("challenge:load", challenge_data)
        
        # レスポンスを待機
        response = await self.receive_specific_message('challenge:loaded', timeout=3.0)
        
        if response:
            logger.info("✅ チャレンジロード成功")
            payload = response.get('payload', {})
            logger.info(f"チャレンジID: {payload.get('id', 'N/A')}")
            logger.info(f"チャレンジ名: {payload.get('name', 'N/A')}")
            return True
        else:
            logger.error("❌ チャレンジロード失敗")
            return False
    
    async def test_difficulty_update(self):
        """難易度更新テスト"""
        logger.info("=== 難易度更新テスト ===")
        
        difficulty_data = {
            "level": 5,
            "description": "エキスパート"
        }
        
        await self.send_message("difficulty:update", difficulty_data)
        
        # レスポンスを待機
        response = await self.receive_specific_message('difficulty:updated', timeout=3.0)
        
        if response:
            logger.info("✅ 難易度更新成功")
            payload = response.get('payload', {})
            logger.info(f"新しい難易度レベル: {payload.get('level', 'N/A')}")
            return True
        else:
            logger.error("❌ 難易度更新失敗")
            return False
    
    async def test_modifier_apply(self):
        """修飾子適用テスト"""
        logger.info("=== 修飾子適用テスト ===")
        
        modifier_data = {
            "type": "speed_boost",
            "value": 1.5,
            "duration": 10
        }
        
        await self.send_message("modifier:apply", modifier_data)
        
        # レスポンスを待機
        response = await self.receive_specific_message('modifier:applied', timeout=3.0)
        
        if response:
            logger.info("✅ 修飾子適用成功")
            payload = response.get('payload', {})
            logger.info(f"修飾子タイプ: {payload.get('type', 'N/A')}")
            logger.info(f"修飾子値: {payload.get('value', 'N/A')}")
            return True
        else:
            logger.error("❌ 修飾子適用失敗")
            return False
    
    async def monitor_game_updates(self, duration=10.0):
        """ゲーム更新の監視"""
        logger.info(f"=== ゲーム更新監視 ({duration}秒間) ===")
        
        start_time = asyncio.get_event_loop().time()
        update_count = 0
        
        while (asyncio.get_event_loop().time() - start_time) < duration:
            message = await self.receive_message(timeout=1.0)
            
            if message:
                msg_type = message.get('type', 'unknown')
                if msg_type in ['game:update', 'score:updated']:
                    update_count += 1
                    payload = message.get('payload', {})
                    logger.info(f"ゲーム更新 #{update_count}: {msg_type}")
                    if 'score' in payload:
                        logger.info(f"  スコア: {payload['score']}")
                    if 'ballsHit' in payload:
                        logger.info(f"  ボールヒット: {payload['ballsHit']}")
        
        logger.info(f"監視完了: {update_count}回の更新を受信")
        return update_count > 0
    
    async def disconnect(self):
        """WebSocket接続を切断"""
        if self.websocket:
            await self.websocket.close()
            self.connected = False
            logger.info("WebSocket接続を切断しました")

async def run_tests():
    """テストスイートの実行"""
    client = WebSocketTestClient()
    
    try:
        # 接続テスト
        if not await client.connect():
            logger.error("接続に失敗したため、テストを中止します")
            return False
        
        # 各種機能テスト（順次実行で並行recv問題を回避）
        tests = [
            ("ゲーム状態リクエスト", client.test_game_state_request()),
            ("チャレンジロード", client.test_challenge_load()),
            ("難易度更新", client.test_difficulty_update()),
            ("修飾子適用", client.test_modifier_apply()),
        ]
        
        results = []
        for test_name, test_coro in tests:
            try:
                logger.info(f"テスト開始: {test_name}")
                result = await test_coro
                results.append(result)
                logger.info(f"テスト完了: {test_name} - {'✅成功' if result else '❌失敗'}")
                # テスト間に少し間隔を置く
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error(f"テスト例外: {test_name} - {str(e)}")
                results.append(False)
        
        # 結果集計
        success_count = sum(1 for result in results if result is True)
        total_count = len(results)
        
        logger.info(f"\n=== テスト結果 ===")
        logger.info(f"成功: {success_count}/{total_count}")
        logger.info(f"成功率: {success_count/total_count*100:.1f}%")
        
        if success_count == total_count:
            logger.info("🎉 すべてのテストが成功しました！")
            return True
        else:
            logger.warning(f"⚠️ {total_count - success_count}個のテストが失敗しました")
            return False
            
    except Exception as e:
        logger.error(f"テスト実行エラー: {e}")
        return False
        
    finally:
        await client.disconnect()

if __name__ == "__main__":
    logger.info("WebSocket通信テストを開始します")
    logger.info("注意: WebSocket統合ゲームエンジンが起動している必要があります")
    logger.info("起動コマンド: python main_websocket_integrated.py")
    logger.info("")
    
    try:
        result = asyncio.run(run_tests())
        if result:
            print("\n✅ WebSocket統合テスト成功")
        else:
            print("\n❌ WebSocket統合テスト失敗")
    except KeyboardInterrupt:
        logger.info("テストが中断されました")
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")