#!/usr/bin/env python3
"""
Ultimate Squash Game - AI Enhanced Version

AI機能を統合したPygame版のエントリーポイント

個人開発規約遵守:
- TDD必須: E2Eテストで動作確認
- モック禁止: 実際のゲーム環境でテスト
- エラー3要素: エラーハンドリング実装

技術移行:
- Pygame-CE対応版
- AI機能（Ollama）統合
- ADA（AI Dynamic Adjustment）実装
"""

import pygame
import sys
import os
import argparse

# srcディレクトリをPythonパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.model.ai_enhanced_game_state import AIEnhancedGameState
from src.view.ai_enhanced_view import AIEnhancedGameView
from src.view.pygame_game_view import PygameSoundView
from src.controller.ai_enhanced_controller import AIEnhancedController


def parse_arguments():
    """コマンドライン引数の解析"""
    parser = argparse.ArgumentParser(description='Ultimate Squash Game - AI Enhanced')
    parser.add_argument('--no-ai', action='store_true', help='AI機能を無効化')
    parser.add_argument('--no-sound', action='store_true', help='サウンドを無効化')
    parser.add_argument('--fps', type=int, default=60, help='目標FPS（デフォルト: 60）')
    parser.add_argument('--fullscreen', action='store_true', help='フルスクリーンで起動')
    return parser.parse_args()


def check_ollama_status():
    """Ollamaの状態を確認"""
    try:
        import subprocess
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Ollamaが起動しています")
            # Mistralモデルの確認
            if 'mistral' in result.stdout.lower():
                print("✓ Mistralモデルが利用可能です")
                return True
            else:
                print("⚠ Mistralモデルが見つかりません")
                print("  実行してください: ollama pull mistral")
                return False
        else:
            print("⚠ Ollamaが起動していません")
            print("  Ollamaを起動してください")
            return False
    except FileNotFoundError:
        print("⚠ Ollamaがインストールされていません")
        print("  https://ollama.ai からインストールしてください")
        return False
    except Exception as e:
        print(f"⚠ Ollama確認中にエラーが発生: {str(e)}")
        return False


def main():
    """メイン関数"""
    # コマンドライン引数を解析
    args = parse_arguments()
    
    # Pygame初期化
    pygame.init()
    
    # AI機能の可用性確認
    ai_available = not args.no_ai and check_ollama_status()
    if args.no_ai:
        print("AI機能は無効化されています（--no-ai オプション）")
    elif not ai_available:
        print("AI機能なしで起動します")
    
    try:
        # ウィンドウサイズ設定
        screen_width, screen_height = 800, 600
        
        # フルスクリーンモード
        if args.fullscreen:
            info = pygame.display.Info()
            screen_width = info.current_w
            screen_height = info.current_h
            screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
        else:
            screen = pygame.display.set_mode((screen_width, screen_height))
        
        # ウィンドウタイトル設定
        pygame.display.set_caption("Ultimate Squash Game - AI Enhanced")
        
        # MVC要素の作成（AI強化版）
        game_state = AIEnhancedGameState(
            screen_width=screen_width,
            screen_height=screen_height
        )
        
        game_view = AIEnhancedGameView(
            screen=screen,
            width=screen_width,
            height=screen_height
        )
        
        sound_view = PygameSoundView(
            sound_enabled=not args.no_sound
        )
        
        # AI強化コントローラーの作成
        controller = AIEnhancedController(
            game_state=game_state,
            game_view=game_view,
            sound_view=sound_view,
            target_fps=args.fps,
            ai_enabled=ai_available
        )
        
        # イベントコールバックを登録
        if ai_available:
            game_state.register_event_callback('collision', controller.handle_collision)
            
            # ADA情報を定期的にビューに反映
            def update_ada_view(event_name, event_data):
                if hasattr(controller, 'get_game_statistics'):
                    stats = controller.get_game_statistics()
                    game_view.update_ada_info({
                        'difficulty_modifier': stats.get('difficulty_modifier', 1.0),
                        'miss_ratio': stats.get('miss_ratio', 0.0),
                        'evaluation_progress': controller.hit_count + controller.miss_count
                    })
            
            game_state.register_event_callback('collision', update_ada_view)
        
        # 起動メッセージ
        print("\n" + "="*50)
        print("Ultimate Squash Game - AI Enhanced Edition")
        print("="*50)
        print(f"画面サイズ: {screen_width}x{screen_height}")
        print(f"目標FPS: {args.fps}")
        print(f"AI機能: {'有効' if ai_available else '無効'}")
        print(f"サウンド: {'有効' if not args.no_sound else '無効'}")
        print("\n操作方法:")
        print("- マウス移動: ラケット操作")
        print("- スペース: ポーズ")
        print("- R: リセット")
        print("- ESC: 終了")
        if ai_available:
            print("\nAI機能:")
            print("- リアルタイムコメンタリー")
            print("- AI Dynamic Adjustment (ADA)")
        print("="*50 + "\n")
        
        # ゲームループ開始
        controller.start_game_loop()
        
    except Exception as e:
        error_msg = {
            'what': "ゲーム起動に失敗しました",
            'why': f"初期化中にエラーが発生: {str(e)}",
            'how': "エラーメッセージを確認して再試行してください"
        }
        print(f"\nエラー: {error_msg['what']}")
        print(f"原因: {error_msg['why']}")
        print(f"対処: {error_msg['how']}")
        return 1
        
    finally:
        # Pygame終了
        pygame.quit()
        print("\nゲームを終了しました")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())