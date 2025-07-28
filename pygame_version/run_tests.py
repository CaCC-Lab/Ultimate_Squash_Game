#!/usr/bin/env python3
"""
AI機能の統合テスト
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """必要なモジュールがインポートできるか確認"""
    print("=== インポートテスト ===")
    try:
        from src.model.ai_enhanced_game_state import AIEnhancedGameState
        print("✓ AIEnhancedGameState")
        
        from src.view.ai_enhanced_view import AIEnhancedGameView
        print("✓ AIEnhancedGameView")
        
        from src.controller.ai_enhanced_controller import AIEnhancedController
        print("✓ AIEnhancedController")
        
        from src.ai.gemma_enhancer import GemmaGameEnhancer
        print("✓ GemmaGameEnhancer")
        
        return True
    except Exception as e:
        print(f"✗ インポートエラー: {e}")
        return False


def test_game_state():
    """ゲームステートの基本機能テスト"""
    print("\n=== ゲームステートテスト ===")
    try:
        from src.model.ai_enhanced_game_state import AIEnhancedGameState
        
        # ゲームステート作成
        game_state = AIEnhancedGameState(800, 600)
        print(f"✓ ゲームステート作成: {game_state.width}x{game_state.height}")
        
        # イベントコールバック登録
        events = []
        def callback(event_name, event_data):
            events.append((event_name, event_data))
        
        game_state.register_event_callback('collision', callback)
        print("✓ イベントコールバック登録")
        
        # ボール位置更新テスト
        if game_state.balls:
            ball = game_state.balls[0]
            original_y = ball.y
            game_state.update_ball_position(ball)
            print(f"✓ ボール位置更新: Y {original_y} -> {ball.y}")
        
        return True
    except Exception as e:
        print(f"✗ ゲームステートエラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ai_enhancer():
    """AI機能の基本テスト"""
    print("\n=== AI機能テスト ===")
    try:
        from src.ai.gemma_enhancer import GemmaGameEnhancer
        import asyncio
        
        enhancer = GemmaGameEnhancer()
        
        # 非同期で初期化テスト
        async def test_async():
            # 初期化（Ollamaが無くても動作確認）
            result = await enhancer.initialize()
            print(f"✓ AI初期化: {'成功' if result else '失敗（Ollama未起動）'}")
            
            # コメンタリー生成テスト
            comment = await enhancer.generate_commentary("テストイベント")
            print(f"✓ コメンタリー生成: {comment}")
        
        asyncio.run(test_async())
        return True
        
    except Exception as e:
        print(f"✗ AI機能エラー: {e}")
        return False


def test_racket_attributes():
    """ラケットの属性テスト"""
    print("\n=== ラケット属性テスト ===")
    try:
        from src.model.pygame_game_state import PygameRacket
        
        racket = PygameRacket(x=100, size=80, base_size=80)
        print(f"✓ ラケット作成: x={racket.x}, size={racket.size}")
        print(f"✓ width属性: {racket.width}")
        print(f"✓ height属性: {racket.height}")
        
        return True
    except Exception as e:
        print(f"✗ ラケットエラー: {e}")
        return False


def main():
    """メインテスト実行"""
    print("Ultimate Squash Game - AI統合テスト")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_game_state,
        test_racket_attributes,
        test_ai_enhancer
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 40)
    print(f"テスト結果: {passed}成功 / {failed}失敗")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())