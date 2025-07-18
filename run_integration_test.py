#!/usr/bin/env python3
"""
WebSocket統合テスト オーケストレーター

個人開発規約遵守:
- TDD必須: 統合テストの自動実行
- モック禁止: 実際のプロセス間通信でテスト
- エラー3要素: テスト失敗時の適切なメッセージ
"""

import subprocess
import time
import asyncio
import logging
import sys
import os
import signal
from pathlib import Path

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IntegrationTestRunner:
    def __init__(self):
        self.server_process = None
        self.test_passed = False
        
    def start_game_server(self):
        """WebSocket統合ゲームサーバーを起動"""
        try:
            logger.info("WebSocket統合ゲームサーバーを起動中...")
            
            # ヘッドレスモード用の環境変数を設定
            env = os.environ.copy()
            env['SDL_VIDEODRIVER'] = 'dummy'  # ヘッドレスモード
            
            self.server_process = subprocess.Popen(
                [sys.executable, 'main_websocket_integrated.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                text=True
            )
            
            # サーバーが起動するまで待機
            logger.info("サーバーの起動を待機中...")
            time.sleep(3.0)
            
            # プロセスが生きているか確認
            if self.server_process.poll() is None:
                logger.info("✅ WebSocket統合ゲームサーバーが起動しました")
                return True
            else:
                stdout, stderr = self.server_process.communicate()
                error_msg = {
                    'what': "ゲームサーバーの起動に失敗しました",
                    'why': f"プロセスが終了しました: {stderr}",
                    'how': "依存関係のインストールとポート8765の空きを確認してください"
                }
                logger.error(f"起動エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
                return False
                
        except Exception as e:
            error_msg = {
                'what': "ゲームサーバーの起動でエラーが発生しました",
                'why': f"プロセス起動エラー: {str(e)}",
                'how': "Pythonインタープリターとスクリプトファイルを確認してください"
            }
            logger.error(f"起動エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
    
    async def run_client_tests(self):
        """WebSocketクライアントテストを実行"""
        try:
            logger.info("WebSocketクライアントテストを開始...")
            
            # test_websocket_client.pyを実行
            process = await asyncio.create_subprocess_exec(
                sys.executable, 'test_websocket_client.py',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info("✅ WebSocketクライアントテストが成功しました")
                logger.info("テスト出力:")
                for line in stdout.decode().split('\n'):
                    if line.strip():
                        logger.info(f"  {line}")
                return True
            else:
                logger.error("❌ WebSocketクライアントテストが失敗しました")
                logger.error("エラー出力:")
                for line in stderr.decode().split('\n'):
                    if line.strip():
                        logger.error(f"  {line}")
                return False
                
        except Exception as e:
            error_msg = {
                'what': "クライアントテストの実行でエラーが発生しました",
                'why': f"テスト実行エラー: {str(e)}",
                'how': "test_websocket_client.pyファイルの存在と実行権限を確認してください"
            }
            logger.error(f"テストエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
    
    def stop_game_server(self):
        """ゲームサーバーを停止"""
        if self.server_process:
            try:
                logger.info("ゲームサーバーを停止中...")
                self.server_process.terminate()
                
                # 正常終了を待つ
                try:
                    self.server_process.wait(timeout=5.0)
                    logger.info("✅ ゲームサーバーが正常に停止しました")
                except subprocess.TimeoutExpired:
                    logger.warning("強制終了を実行中...")
                    self.server_process.kill()
                    self.server_process.wait()
                    logger.info("✅ ゲームサーバーが強制停止しました")
                    
            except Exception as e:
                logger.error(f"サーバー停止エラー: {e}")
    
    async def run_full_integration_test(self):
        """完全な統合テストを実行"""
        logger.info("🚀 WebSocket統合テストを開始します")
        logger.info("=" * 50)
        
        try:
            # 1. 前提条件チェック
            if not self.check_prerequisites():
                return False
            
            # 2. ゲームサーバー起動
            if not self.start_game_server():
                return False
            
            # 少し待機してサーバーが完全に起動するまで待つ
            await asyncio.sleep(2.0)
            
            # 3. クライアントテスト実行
            test_result = await self.run_client_tests()
            
            # 4. 結果レポート
            self.generate_test_report(test_result)
            
            return test_result
            
        except Exception as e:
            error_msg = {
                'what': "統合テストの実行でエラーが発生しました",
                'why': f"テスト制御エラー: {str(e)}",
                'how': "ログを確認し、環境設定を見直してください"
            }
            logger.error(f"統合テストエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
            return False
            
        finally:
            # クリーンアップ
            self.stop_game_server()
    
    def check_prerequisites(self):
        """前提条件をチェック"""
        logger.info("前提条件をチェック中...")
        
        checks = [
            ('main_websocket_integrated.py', 'WebSocket統合ゲームエンジン'),
            ('test_websocket_client.py', 'WebSocketクライアントテスト'),
            ('src/websocket_server.py', 'WebSocketサーバーモジュール')
        ]
        
        for file_path, description in checks:
            if not Path(file_path).exists():
                error_msg = {
                    'what': f"必要なファイルが見つかりません: {description}",
                    'why': f"ファイルパス '{file_path}' が存在しません",
                    'how': "必要なファイルが正しい場所に配置されているか確認してください"
                }
                logger.error(f"前提条件エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
                return False
        
        logger.info("✅ 前提条件チェック完了")
        return True
    
    def generate_test_report(self, test_result):
        """テスト結果レポートを生成"""
        logger.info("=" * 50)
        logger.info("📊 WebSocket統合テスト結果レポート")
        logger.info("=" * 50)
        
        if test_result:
            logger.info("🎉 統合テスト成功")
            logger.info("")
            logger.info("確認された機能:")
            logger.info("  ✅ WebSocketサーバーの起動")
            logger.info("  ✅ クライアント接続の確立")
            logger.info("  ✅ ゲーム状態の送受信")
            logger.info("  ✅ チャレンジデータの交換")
            logger.info("  ✅ 難易度設定の同期")
            logger.info("  ✅ ゲーム修飾子の適用")
            logger.info("")
            logger.info("次のステップ:")
            logger.info("  → ゲームエンジンとチャレンジシステムの統合")
            logger.info("  → E2Eテストでの動作確認")
            logger.info("  → 本番環境での性能テスト")
        else:
            logger.error("❌ 統合テスト失敗")
            logger.error("")
            logger.error("考えられる原因:")
            logger.error("  - WebSocketサーバーの起動失敗")
            logger.error("  - ポート8765の競合")
            logger.error("  - 依存関係の不足")
            logger.error("  - Pygame初期化の問題")
            logger.error("")
            logger.error("対応方法:")
            logger.error("  1. pip install -r requirements.txt")
            logger.error("  2. lsof -i :8765 でポート使用状況確認")
            logger.error("  3. 個別コンポーネントの動作確認")
        
        logger.info("=" * 50)

async def main():
    """メイン実行関数"""
    runner = IntegrationTestRunner()
    
    try:
        result = await runner.run_full_integration_test()
        return 0 if result else 1
        
    except KeyboardInterrupt:
        logger.info("テストが中断されました")
        return 1
        
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        return 1
        
    finally:
        # 必要に応じてクリーンアップ
        runner.stop_game_server()

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)