
"""Ultimate Squash Game - Pygame-CE/WASM版メインエントリーポイント"""

import pygame
import asyncio
import sys
from typing import Optional

# MVCコンポーネントのインポート
try:
    from src.model.pygame_game_state import PygameGameState
    from src.view.pygame_game_view import PygameGameView
    from src.controller.pygame_game_controller import PygameGameController
except ImportError:
    # Pyodide環境でのインポートエラー対策
    sys.path.append('/home/pyodide')
    from src.model.pygame_game_state import PygameGameState
    from src.view.pygame_game_view import PygameGameView
    from src.controller.pygame_game_controller import PygameGameController

# 定数
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
BACKGROUND_COLOR = (0, 0, 0)  # 黒
WINDOW_TITLE = "Ultimate Squash Game - Pygame-CE/WASM版"
FPS = 60


class Game:
    """ゲームのメインクラス（MVCの統合）"""
    
    def __init__(self):
        pygame.init()
        
        # 画面の初期化
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption(WINDOW_TITLE)
        
        # クロックの初期化
        self.clock = pygame.time.Clock()
        
        # MVCコンポーネントの初期化
        self.model = PygameGameState()
        self.view = PygameGameView(self.screen)
        self.controller = PygameGameController(self.model, self.view)
        
        # Model-View接続（Observer パターン）
        self.model.add_observer(self.view)
        
        self.running = True
    
    async def run(self):
        """非同期ゲームループ（Pyodide対応）"""
        while self.running:
            # イベント処理
            events = pygame.event.get()
            for event in events:
                if event.type == pygame.QUIT:
                    self.running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        self.running = False
                    elif event.key == pygame.K_SPACE:
                        self.model.toggle_pause()
                    elif event.key == pygame.K_r:
                        self.model.reset_game()
                elif event.type == pygame.MOUSEMOTION:
                    # マウス位置に合わせてパドルを移動
                    mouse_x, _ = event.pos
                    self.controller.handle_mouse_motion(mouse_x)
            
            # ゲーム状態の更新（ポーズ中でなければ）
            if not self.model.paused and not self.model.is_gameover:
                self.controller.update_game_frame()
            
            # 画面の描画
            self.screen.fill(BACKGROUND_COLOR)
            self.view.draw_game(self.model)
            
            # FPS制御
            self.clock.tick(FPS)
            pygame.display.flip()
            
            # Pyodide環境での非同期処理
            await asyncio.sleep(0)
        
        pygame.quit()


async def main():
    """メインエントリーポイント"""
    try:
        game = Game()
        await game.run()
    except Exception as e:
        print(f"ゲームエラー: {e}")
        import traceback
        traceback.print_exc()


# Pyodide環境での実行
if __name__ == '__main__':
    # 通常のPython環境
    if 'pyodide' not in sys.modules:
        asyncio.run(main())
    else:
        # Pyodide環境（await main()はHTMLから呼ばれる）
        pass
