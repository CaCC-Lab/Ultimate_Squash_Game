#!/usr/bin/env python3
"""
改善されたAOTバイトコード最適化の簡易テスト
"""

import sys
import os
import time
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "tools"))

from python_bundler import PythonBundler

def quick_test():
    """改善されたバイトコード最適化のテスト"""
    print("🚀 改善版AOTバイトコード最適化クイックテスト")
    print("=" * 50)
    
    source_dir = project_root / "src"
    output_base = project_root / "dist/test"
    output_base.mkdir(parents=True, exist_ok=True)
    
    # テスト実行
    print("\n--- バイトコードモード（改善版） ---")
    start_time = time.time()
    
    try:
        bundler = PythonBundler(
            source_dir=str(source_dir),
            output_file=str(output_base / "bundle_improved.py"),
            use_bytecode=True,
            verbose=True
        )
        
        # バイトコードコンパイル
        bundler.compile_to_bytecode()
        
        # 依存関係解析
        bundler.analyze_dependencies()
        
        # バンドル生成
        bundler.generate_bundle()
        
        build_time = (time.time() - start_time) * 1000
        print(f"✅ 改善版ビルド時間: {build_time:.1f}ms")
        
        # 統計情報
        print(f"コンパイル時間: {bundler.compilation_stats['total_compilation_time']:.1f}ms")
        print(f"コンパイル済みモジュール: {bundler.compilation_stats['modules_compiled']}")
        
        return build_time
        
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = quick_test()
    if result:
        print(f"\n🎯 改善版結果: {result:.1f}ms")
        print("📝 改善のポイント:")
        print("  - .pycファイルをBase64エンコードして直接埋め込み")
        print("  - ソースファイル再読み込みを回避")
        print("  - Pyodideでの直接バイトコード実行対応")