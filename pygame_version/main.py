
import pygame
import sys

# 定数
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
BACKGROUND_COLOR = (0, 0, 0) # 黒
WINDOW_TITLE = "Ultimate Squash Game"

def main():
    """
    メインのゲーム関数
    """
    pygame.init()

    # ウィンドウとサーフェスの設定
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption(WINDOW_TITLE)

    clock = pygame.time.Clock()
    running = True

    while running:
        # イベント処理
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False

        # 画面の描画
        screen.fill(BACKGROUND_COLOR)

        # ディスプレイの更新
        pygame.display.flip()

        # フレームレートの制御
        clock.tick(60)

    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()
