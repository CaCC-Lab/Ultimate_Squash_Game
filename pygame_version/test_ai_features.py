#!/usr/bin/env python3
"""
AI機能のテストスクリプト

AI強化版Ultimate Squash Gameの動作確認
"""

import subprocess
import sys
import time


def check_ollama():
    """Ollamaの状態確認"""
    print("Ollamaの状態を確認中...")
    try:
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Ollamaが起動しています")
            # Gemmaモデルまたはmistralモデルを確認
            if 'gemma' in result.stdout.lower() or 'mistral' in result.stdout.lower():
                if 'gemma' in result.stdout.lower():
                    print("✓ Gemmaモデルが利用可能です")
                if 'mistral' in result.stdout.lower():
                    print("✓ Mistralモデルが利用可能です")
                return True
            else:
                print("✗ 対応モデル（Gemma/Mistral）が見つかりません")
                print("  実行: ollama pull gemma2:2b")
                return False
        else:
            print("✗ Ollamaが起動していません")
            return False
    except FileNotFoundError:
        print("✗ Ollamaがインストールされていません")
        return False


def test_ai_game():
    """AI機能付きゲームのテスト起動"""
    print("\nAI機能付きゲームを起動中...")
    
    # 5秒間実行してから終了
    try:
        process = subprocess.Popen(
            [sys.executable, 'main_ai.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 5秒待機
        print("5秒間のテスト実行中...")
        time.sleep(5)
        
        # プロセスを終了
        process.terminate()
        stdout, stderr = process.communicate(timeout=2)
        
        print("\n--- 標準出力 ---")
        print(stdout)
        
        if stderr:
            print("\n--- エラー出力 ---")
            print(stderr)
        
        print("\n✓ テスト完了")
        return True
        
    except Exception as e:
        print(f"\n✗ テスト失敗: {str(e)}")
        return False


def main():
    """メイン処理"""
    print("=" * 50)
    print("AI機能テストスクリプト")
    print("=" * 50)
    
    # Ollamaチェック
    if not check_ollama():
        print("\nOllamaの設定を確認してください")
        return 1
    
    # ゲームテスト
    if not test_ai_game():
        return 1
    
    print("\n全てのテストが完了しました")
    return 0


if __name__ == "__main__":
    sys.exit(main())