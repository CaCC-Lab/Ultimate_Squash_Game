import ollama
import asyncio
import json
from typing import Dict, List, Optional

class OllamaGameEnhancer:
    def __init__(self):
        self.model = "mistral"
        self.game_history = []
        self.cached_responses = {}
        
    async def initialize(self):
        try:
            response = await ollama.list()
            print(f"Available models: {response}")
            return True
        except Exception as e:
            print(f"Ollama initialization error: {e}")
            return False

    # ... [前回のOllamaGameEnhancerクラスの残りのメソッド]

class AIGameModeManager:
    def __init__(self, enhancer: OllamaGameEnhancer):
        self.enhancer = enhancer
        self.current_challenge = None
        self.active_modifications = []
        
    # ... [前回のAIGameModeManagerクラスの残りのメソッド]