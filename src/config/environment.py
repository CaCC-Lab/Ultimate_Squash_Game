"""
環境設定管理モジュール
開発/本番環境の設定を一元管理
"""

import os
from typing import Dict, Any, Optional


class EnvironmentConfig:
    """環境設定管理クラス"""
    
    def __init__(self):
        self.env = os.environ.get('GAME_ENV', 'production').lower()
        self.is_development = self.env in ['development', 'dev', 'debug']
        self.is_production = self.env in ['production', 'prod']
        self.is_test = self.env in ['test', 'testing']
    
    def get_config(self) -> Dict[str, Any]:
        """現在の環境に応じた設定を取得"""
        base_config = {
            'debug_mode': False,
            'logging_level': 'INFO',
            'websocket_auth': True,
            'websocket_host': 'localhost',
            'websocket_port': 8765,
            'gc_debug': False,
            'performance_monitoring': False,
            'error_reporting': True,
        }
        
        if self.is_development:
            # 開発環境の設定
            base_config.update({
                'debug_mode': True,
                'logging_level': 'DEBUG',
                'websocket_auth': False,  # 開発時は認証を無効化
                'gc_debug': True,
                'performance_monitoring': True,
                'error_reporting': True,
            })
        elif self.is_test:
            # テスト環境の設定
            base_config.update({
                'debug_mode': True,
                'logging_level': 'WARNING',
                'websocket_auth': True,
                'gc_debug': False,
                'performance_monitoring': False,
                'error_reporting': False,
            })
        
        # 環境変数による個別設定のオーバーライド
        self._apply_env_overrides(base_config)
        
        return base_config
    
    def _apply_env_overrides(self, config: Dict[str, Any]):
        """環境変数による設定のオーバーライド"""
        # デバッグモード
        if 'DEBUG_MODE' in os.environ:
            config['debug_mode'] = os.environ['DEBUG_MODE'].lower() == 'true'
        
        # ログレベル
        if 'LOG_LEVEL' in os.environ:
            config['logging_level'] = os.environ['LOG_LEVEL'].upper()
        
        # WebSocket認証
        if 'WS_AUTH_ENABLED' in os.environ:
            config['websocket_auth'] = os.environ['WS_AUTH_ENABLED'].lower() == 'true'
        
        # WebSocketホスト/ポート
        if 'WS_HOST' in os.environ:
            config['websocket_host'] = os.environ['WS_HOST']
        if 'WS_PORT' in os.environ:
            try:
                config['websocket_port'] = int(os.environ['WS_PORT'])
            except ValueError:
                # 無効な値の場合はデフォルト値を使用
                pass
        
        # GCデバッグ
        if 'GC_DEBUG' in os.environ:
            config['gc_debug'] = os.environ['GC_DEBUG'].lower() == 'true'
        
        # パフォーマンス監視
        if 'PERF_MONITORING' in os.environ:
            config['performance_monitoring'] = os.environ['PERF_MONITORING'].lower() == 'true'
    
    def get(self, key: str, default: Any = None) -> Any:
        """特定の設定値を取得"""
        config = self.get_config()
        return config.get(key, default)
    
    def is_debug(self) -> bool:
        """デバッグモードかどうか"""
        return self.get('debug_mode', False)
    
    def get_websocket_url(self) -> str:
        """WebSocket接続URLを取得"""
        host = self.get('websocket_host', 'localhost')
        port = self.get('websocket_port', 8765)
        return f"ws://{host}:{port}"
    
    def __repr__(self):
        return f"EnvironmentConfig(env='{self.env}', debug={self.is_debug()})"


# グローバルインスタンス
config = EnvironmentConfig()


def get_config() -> EnvironmentConfig:
    """設定インスタンスを取得"""
    return config


def is_debug_mode() -> bool:
    """デバッグモードかどうか"""
    return config.is_debug()


def get_websocket_config() -> Dict[str, Any]:
    """WebSocket関連の設定を取得"""
    return {
        'url': config.get_websocket_url(),
        'auth_enabled': config.get('websocket_auth', True),
        'host': config.get('websocket_host', 'localhost'),
        'port': config.get('websocket_port', 8765),
    }