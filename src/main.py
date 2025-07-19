from game.engine import GameEngine, game_state

def main():
    # ゲームの作成と開始（AI機能なし）
    game = GameEngine()
    
    # グローバルゲーム状態にエンジンを設定（JavaScript連携用）
    game_state.set_game_engine(game)
    
    game.start()

def create_game_for_web():
    """Web版（Pyodide）用のゲーム作成関数"""
    game = GameEngine()
    game_state.set_game_engine(game)
    return game

if __name__ == "__main__":
    main()