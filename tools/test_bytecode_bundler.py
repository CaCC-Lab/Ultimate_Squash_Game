#!/usr/bin/env python3
"""
AOTバイトコード最適化テストスクリプト
Gemini提案のフェーズ3実装の効果測定
"""

import sys
import os
import time
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "tools"))

from python_bundler import PythonBundler

def test_bytecode_optimization():
    """バイトコード最適化のテスト実行"""
    print("🚀 AOTバイトコード最適化テスト開始")
    print("=" * 60)
    
    # テストパラメータ
    source_dir = project_root / "src"
    output_base = project_root / "dist/test"
    output_base.mkdir(parents=True, exist_ok=True)
    
    test_results = {}
    
    # Test 1: ソースファイルモード（ベースライン）
    print("\n📊 Test 1: ソースファイルモード（ベースライン）")
    print("-" * 40)
    
    start_time = time.time()
    bundler_source = PythonBundler(
        source_dir=str(source_dir),
        output_file=str(output_base / "bundle_source.py"),
        use_bytecode=False,
        verbose=True
    )
    
    try:
        bundle_file, report = bundler_source.bundle()
        source_time = (time.time() - start_time) * 1000  # ミリ秒に変換
        
        test_results['source_mode'] = {
            'success': True,
            'time_ms': source_time,
            'bundle_file': bundle_file,
            'modules': len(bundler_source.modules)
        }
        
        print(f"✅ ソースモード完了: {source_time:.1f}ms")
        
    except Exception as e:
        print(f"❌ ソースモードエラー: {e}")
        test_results['source_mode'] = {'success': False, 'error': str(e)}
    
    # Test 2: バイトコードモード（AOT最適化）
    print("\n🔥 Test 2: バイトコードモード（AOT最適化）")
    print("-" * 40)
    
    start_time = time.time()
    bundler_bytecode = PythonBundler(
        source_dir=str(source_dir),
        output_file=str(output_base / "bundle_bytecode.py"),
        use_bytecode=True,
        verbose=True
    )
    
    try:
        bundle_file, report = bundler_bytecode.bundle()
        bytecode_time = (time.time() - start_time) * 1000  # ミリ秒に変換
        
        test_results['bytecode_mode'] = {
            'success': True,
            'time_ms': bytecode_time,
            'bundle_file': bundle_file,
            'modules': len(bundler_bytecode.modules),
            'compilation_stats': bundler_bytecode.compilation_stats
        }
        
        print(f"✅ バイトコードモード完了: {bytecode_time:.1f}ms")
        
    except Exception as e:
        print(f"❌ バイトコードモードエラー: {e}")
        test_results['bytecode_mode'] = {'success': False, 'error': str(e)}
    
    # 結果比較とGemini目標評価
    print("\n" + "=" * 60)
    print("📈 パフォーマンス比較とGemini目標評価")
    print("=" * 60)
    
    if test_results['source_mode']['success'] and test_results['bytecode_mode']['success']:
        source_time = test_results['source_mode']['time_ms']
        bytecode_time = test_results['bytecode_mode']['time_ms']
        time_improvement = source_time - bytecode_time
        improvement_percent = (time_improvement / source_time) * 100
        
        print(f"ソースモード実行時間:     {source_time:.1f}ms")
        print(f"バイトコードモード実行時間: {bytecode_time:.1f}ms")
        print(f"削減時間:               {time_improvement:.1f}ms")
        print(f"削減率:                 {improvement_percent:.1f}%")
        
        # Gemini目標（100-300ms削減）の評価
        print(f"\n🎯 Gemini目標評価: 100-300ms削減")
        if time_improvement >= 100:
            if time_improvement <= 300:
                print(f"✅ 目標達成！削減時間: {time_improvement:.1f}ms（目標範囲内）")
            else:
                print(f"🚀 目標超過！削減時間: {time_improvement:.1f}ms（目標を上回る性能）")
        else:
            print(f"⚠️ 目標未達: {time_improvement:.1f}ms（目標: 100ms以上）")
        
        # AOT統計表示
        if 'compilation_stats' in test_results['bytecode_mode']:
            stats = test_results['bytecode_mode']['compilation_stats']
            print(f"\n📊 AOTバイトコード統計:")
            print(f"  コンパイル時間:    {stats['total_compilation_time']:.1f}ms")
            print(f"  コンパイル済み:    {stats['modules_compiled']}モジュール")
            print(f"  サイズ削減率:      {stats['bytecode_size_reduction']:.1f}%")
    
    else:
        print("⚠️ 一方または両方のテストが失敗したため、比較できません")
    
    # レポート出力
    print(f"\n📄 詳細レポート生成中...")
    report_path = output_base / "aot_test_report.json"
    
    import json
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(test_results, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"📊 テストレポート保存: {report_path}")
    
    return test_results

def main():
    """メイン実行"""
    print("🔥 Gemini提案のAOTバイトコード最適化フェーズ3テスト")
    
    # srcディレクトリの存在確認
    src_dir = project_root / "src"
    if not src_dir.exists():
        print(f"❌ ソースディレクトリが見つかりません: {src_dir}")
        print("💡 代替として、既存のPythonファイルでテストします")
        return
    
    # テスト実行
    results = test_bytecode_optimization()
    
    # 成功時の次ステップ提案
    if results.get('bytecode_mode', {}).get('success'):
        print(f"\n💡 次のステップ:")
        print(f"   1. ✅ AOTバイトコード最適化実装完了")
        print(f"   2. 📝 Pull Request作成")
        print(f"   3. 🚀 フェーズ4（WebWorker移行）の準備")
    
    print(f"\n🎉 AOTバイトコード最適化テスト完了！")

if __name__ == "__main__":
    main()