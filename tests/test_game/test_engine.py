# CLAUDE-GENERATED: Claude Code v4.0 - 2025-01-13
# 個人開発規約準拠: TDD実践、モック禁止、エラー3要素対応
# テスト戦略: src/game/engine.py のユニットテスト

import pytest
from src.game.engine import GameEngine


class TestGameEngine:
    """GameEngineクラスの基本機能テスト"""
    
    def test_game_engine_initialization(self):
        """ゲームエンジンの初期化テスト"""
        # GIVEN: GameEngineを作成
        engine = GameEngine()
        
        # THEN: 初期状態が正しく設定されている
        assert engine is not None
        assert hasattr(engine, 'win')  # tkinterウィンドウ
        assert hasattr(engine, 'cv')   # キャンバス
        assert hasattr(engine, 'is_gameover')
        assert hasattr(engine, 'point')
        assert hasattr(engine, 'balls')
        
    def test_initial_game_state(self):
        """ゲーム初期状態のテスト"""
        # GIVEN: 新しいGameEngine
        engine = GameEngine()
        
        # THEN: 初期値が正しく設定されている
        assert engine.is_gameover == False
        assert engine.point == 0
        assert engine.level == 1
        assert engine.combo == 0
        assert engine.paused == False
        assert len(engine.balls) == 1  # 初期ボール1個
        
    def test_ball_initial_properties(self):
        """ボールの初期プロパティテスト"""
        # GIVEN: 新しいGameEngine
        engine = GameEngine()
        
        # WHEN: 初期ボールを取得
        initial_ball = engine.balls[0]
        
        # THEN: ボールの初期値が正しい
        assert initial_ball['x'] == 320  # 中央X座標
        assert initial_ball['y'] == 250  # 中央Y座標
        assert initial_ball['size'] == 10
        assert initial_ball['color'] == 'red'
        assert 'dx' in initial_ball  # X方向速度
        assert 'dy' in initial_ball  # Y方向速度