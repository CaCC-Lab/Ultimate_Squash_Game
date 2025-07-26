"""
Gemma対応AI強化モジュール

Ollamaで利用可能なGemmaモデルを使用したゲーム強化機能
"""

import ollama
import asyncio
import json
from typing import Dict, List, Optional


class GemmaGameEnhancer:
    """Gemmaモデルを使用したゲーム強化クラス"""
    
    def __init__(self, model_name: str = "gemma2:2b"):
        """
        初期化
        
        Args:
            model_name: str - 使用するGemmaモデル名
        """
        self.model = model_name
        self.game_history = []
        self.cached_responses = {}
        self.context_prompt = """あなたはゲームコメンテーターです。Ultimate Squash Gameのプレイ状況に対して、
短く的確なコメントを日本語で行ってください。コメントは20文字以内で。"""
        
    async def initialize(self):
        """AI機能の初期化"""
        try:
            # モデルが利用可能か確認
            models = await self._get_available_models()
            if self.model in models:
                print(f"✓ {self.model}モデルが利用可能です")
                return True
            else:
                # 代替モデルを探す
                gemma_models = [m for m in models if 'gemma' in m.lower()]
                if gemma_models:
                    self.model = gemma_models[0]
                    print(f"✓ 代替モデル{self.model}を使用します")
                    return True
                else:
                    print(f"✗ Gemmaモデルが見つかりません")
                    return False
        except Exception as e:
            print(f"Ollama初期化エラー: {e}")
            return False
    
    async def _get_available_models(self) -> List[str]:
        """利用可能なモデルのリストを取得"""
        try:
            import subprocess
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')[1:]  # ヘッダーをスキップ
                models = []
                for line in lines:
                    if line.strip():
                        model_name = line.split()[0]
                        models.append(model_name)
                return models
            return []
        except:
            return []
    
    async def generate_commentary(self, game_event: str) -> str:
        """
        ゲームイベントに対するコメンタリーを生成
        
        Args:
            game_event: str - ゲームイベントの説明
            
        Returns:
            str: 生成されたコメンタリー
        """
        # キャッシュチェック
        if game_event in self.cached_responses:
            return self.cached_responses[game_event]
        
        try:
            # プロンプトを構築
            prompt = f"{self.context_prompt}\n\nイベント: {game_event}\nコメント:"
            
            # Ollamaでレスポンスを生成
            response = await asyncio.to_thread(
                ollama.chat,
                model=self.model,
                messages=[
                    {
                        'role': 'system',
                        'content': self.context_prompt
                    },
                    {
                        'role': 'user', 
                        'content': f"イベント: {game_event}"
                    }
                ],
                options={
                    'temperature': 0.7,
                    'max_tokens': 50
                }
            )
            
            commentary = response['message']['content'].strip()
            
            # 長すぎる場合は短縮
            if len(commentary) > 30:
                commentary = commentary[:30] + "..."
            
            # キャッシュに保存
            self.cached_responses[game_event] = commentary
            
            return commentary
            
        except Exception as e:
            print(f"コメンタリー生成エラー: {e}")
            # フォールバックコメント
            if "打ち返しました" in game_event:
                return "ナイスヒット！"
            elif "打ち返せませんでした" in game_event:
                return "惜しい！"
            else:
                return "がんばれ！"


class AIGameModeManager:
    """AI駆動のゲームモード管理クラス"""
    
    def __init__(self, enhancer: GemmaGameEnhancer):
        """
        初期化
        
        Args:
            enhancer: GemmaGameEnhancer - AI強化エンジン
        """
        self.enhancer = enhancer
        self.current_challenge = None
        self.active_modifications = []
    
    async def suggest_challenge(self, player_stats: Dict) -> Dict:
        """
        プレイヤーの統計に基づいてチャレンジを提案
        
        Args:
            player_stats: Dict - プレイヤーの統計情報
            
        Returns:
            Dict: チャレンジ情報
        """
        # シンプルなチャレンジ生成
        hit_rate = player_stats.get('hit_rate', 0.5)
        
        if hit_rate > 0.8:
            return {
                'name': 'スピードチャレンジ',
                'description': 'ボールの速度が1.5倍になります',
                'difficulty_modifier': 1.5
            }
        elif hit_rate < 0.3:
            return {
                'name': 'スローモード',
                'description': 'ボールの速度が0.7倍になります',
                'difficulty_modifier': 0.7
            }
        else:
            return {
                'name': '通常モード',
                'description': '標準的な難易度です',
                'difficulty_modifier': 1.0
            }