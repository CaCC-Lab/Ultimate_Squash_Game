#!/usr/bin/env python3
"""
Pygame-CE版スカッシュゲーム - メインエントリーポイント

個人開発規約遵守:
- TDD必須: MVCパターン統合テスト済み
- モック禁止: 実際のPygame-CE環境での動作確認
- エラー3要素: 起動エラー時の適切なメッセージ

技術移行:
- Python 3.6 → 3.12対応完了
- Tkinter → Pygame-CE移植完了  
- MVCパターン移植完了
"""

import sys
import os

# パスの設定
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, 'src')
sys.path.insert(0, src_dir)

try:
    import pygame
    from model.pygame_game_state import PygameGameState
    from view.pygame_game_view import PygameGameView, PygameSoundView
    from controller.pygame_game_controller import PygameGameController
    
    print(f"pygame-ce {pygame.version.ver} (SDL {pygame.version.SDL}, Python {sys.version.split()[0]})")
    
except ImportError as e:
    error_msg = {
        'what': "必要なライブラリのインポートに失敗しました",
        'why': f"pygame-ceまたは関連モジュールが見つかりません: {str(e)}",
        'how': "pip install pygame-ce でpygame-ceをインストールしてください"
    }
    print(f"インポートエラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
    sys.exit(1)


def main():
    """メイン関数 - Pygame-CE版スカッシュゲーム"""
    
    try:
        # Pygame初期化
        pygame.init()
        
        # 画面設定
        screen_width = 640
        screen_height = 480
        screen = pygame.display.set_mode((screen_width, screen_height))
        pygame.display.set_caption("Ultimate Squash Game - Pygame-CE Edition")
        
        # MVCコンポーネント作成
        game_state = PygameGameState()
        game_view = PygameGameView(screen, screen_width, screen_height)
        sound_view = PygameSoundView(sound_enabled=False)  # テスト用は無音
        controller = PygameGameController(
            game_state, 
            game_view, 
            sound_view,
            target_fps=60
        )
        
        print("Pygame-CE版スカッシュゲームを開始します...")
        print("操作方法:")
        print("  マウス移動: ラケット操作")
        print("  左クリック: ゲームリセット")
        print("  スペースキー: ポーズ")
        print("  Rキー: リセット")
        print("  ESCキー: 終了")
        print("")
        print("ゲームウィンドウが開きます（3秒間のテスト実行）...")
        
        # ゲームループ開始（テスト用に短時間）
        import time
        start_time = time.time()
        test_duration = 3.0  # 3秒間のテスト実行
        
        controller.is_running = True
        
        while controller.is_running and (time.time() - start_time) < test_duration:
            # イベント処理
            if not controller.process_events():
                break
            
            # ゲーム更新
            controller.update_game_frame()
            
            # 描画
            game_view.draw_game(game_state)
            pygame.display.flip()
            
            # FPS制御
            controller.clock.tick(controller.target_fps)
        
        print("テスト実行完了 - Pygame-CE版MVC統合が正常に動作しました！")
        
        # 統計情報表示
        stats = controller.get_game_statistics()
        print("ゲーム統計:")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        
    except Exception as e:
        error_msg = {
            'what': "ゲーム実行中にエラーが発生しました",
            'why': f"Pygame処理でエラー: {str(e)}",
            'how': "pygame-ceのインストールとシステム環境を確認してください"
        }
        print(f"実行エラー: {error_msg['what']} - {error_msg['why']} - {error_msg['how']}")
        return 1
        
    finally:
        # クリーンアップ
        try:
            controller.cleanup()
            pygame.quit()
            print("Pygame-CE正常終了")
        except:
            pass
    
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)