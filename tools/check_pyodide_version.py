#!/usr/bin/env python3
"""
Pyodide バージョン確認スクリプト
Gemini提案のAOTバイトコード最適化 - 第1段階

Pyodide v0.26.4の実際のPythonバージョンを確認し、
ローカル環境との互換性をチェックする
"""

import sys
import subprocess
import json
from pathlib import Path

def check_current_python():
    """現在のPythonバージョンを確認"""
    print("🐍 現在のPython環境:")
    print(f"  バージョン: {sys.version}")
    print(f"  実行パス: {sys.executable}")
    print(f"  プラットフォーム: {sys.platform}")
    
    return {
        'version': sys.version_info,
        'version_string': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        'executable': sys.executable,
        'platform': sys.platform
    }

def get_pyodide_info():
    """プロジェクトで使用されているPyodideの情報を取得"""
    project_root = Path(__file__).parent.parent
    
    # parallel-initializer.jsからPyodideバージョンを取得
    parallel_init_file = project_root / "docs" / "js" / "parallel-initializer.js"
    pyodide_version = None
    
    if parallel_init_file.exists():
        with open(parallel_init_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # CDN URLからバージョンを抽出
            import re
            version_match = re.search(r'cdn\.jsdelivr\.net/pyodide/v([\d.]+)', content)
            if version_match:
                pyodide_version = version_match.group(1)
    
    print("🌐 プロジェクトのPyodide情報:")
    print(f"  使用バージョン: {pyodide_version or 'Unknown'}")
    
    # Pyodide v0.26.4 の既知情報
    pyodide_info = {
        'version': pyodide_version,
        'expected_python_version': '3.12',  # Pyodide v0.26.4はPython 3.12ベース
        'compatibility_note': 'バイトコード互換性のため完全一致が必要'
    }
    
    return pyodide_info

def check_compileall_compatibility():
    """compileall モジュールの動作確認"""
    print("📦 compileall モジュール確認:")
    
    try:
        import compileall
        import py_compile
        import os
        import tempfile
        
        # テスト用の一時ファイル作成
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
# テスト用Pythonコード
def test_function():
    print("Hello from compiled bytecode!")
    return 42

if __name__ == "__main__":
    test_function()
""")
            test_file = f.name
        
        # 単一ファイルのコンパイルテスト
        try:
            py_compile.compile(test_file, doraise=True)
            print("  ✅ 単一ファイルコンパイル: OK")
        except Exception as e:
            print(f"  ❌ 単一ファイルコンパイル: {e}")
            return False
        
        # ディレクトリコンパイルテスト
        test_dir = os.path.dirname(test_file)
        try:
            compileall.compile_dir(test_dir, quiet=True)
            print("  ✅ ディレクトリコンパイル: OK")
        except Exception as e:
            print(f"  ❌ ディレクトリコンパイル: {e}")
        
        # クリーンアップ
        os.unlink(test_file)
        pyc_file = test_file + 'c'
        if os.path.exists(pyc_file):
            os.unlink(pyc_file)
            
        return True
        
    except ImportError as e:
        print(f"  ❌ compileall モジュールが利用できません: {e}")
        return False

def analyze_project_structure():
    """プロジェクトのPythonファイル構造を分析"""
    project_root = Path(__file__).parent.parent
    src_dir = project_root / "src"
    
    print("📁 プロジェクト構造分析:")
    print(f"  プロジェクトルート: {project_root}")
    print(f"  Pythonソース: {src_dir}")
    
    if not src_dir.exists():
        print("  ❌ src ディレクトリが見つかりません")
        return None
    
    # Pythonファイルの収集
    python_files = list(src_dir.rglob("*.py"))
    
    print(f"  📄 Pythonファイル数: {len(python_files)}")
    for py_file in python_files:
        rel_path = py_file.relative_to(src_dir)
        print(f"    - {rel_path}")
    
    # 既存のバンドルファイル確認
    bundle_file = project_root / "bundled_game.py"
    if bundle_file.exists():
        bundle_size = bundle_file.stat().st_size
        print(f"  📦 既存バンドル: bundled_game.py ({bundle_size:,} bytes)")
    
    return {
        'src_dir': src_dir,
        'python_files': python_files,
        'bundle_exists': bundle_file.exists(),
        'bundle_size': bundle_file.stat().st_size if bundle_file.exists() else 0
    }

def generate_compatibility_report():
    """互換性レポートを生成"""
    current_python = check_current_python()
    pyodide_info = get_pyodide_info()
    compileall_ok = check_compileall_compatibility()
    project_info = analyze_project_structure()
    
    print("\n" + "="*60)
    print("🔍 AOTバイトコード最適化 互換性レポート")
    print("="*60)
    
    # Python バージョン互換性
    current_version = current_python['version_string']
    expected_version = pyodide_info['expected_python_version']
    
    version_compatible = current_version.startswith(expected_version)
    
    print(f"🐍 Pythonバージョン互換性:")
    print(f"  現在: {current_version}")
    print(f"  必要: {expected_version}.x")
    print(f"  互換性: {'✅ OK' if version_compatible else '❌ 要調整'}")
    
    if not version_compatible:
        print(f"  ⚠️  バイトコード互換性のため Python {expected_version} の使用を推奨")
    
    # 実装可能性評価
    implementation_feasible = all([
        compileall_ok,
        project_info is not None,
        len(project_info['python_files']) > 0 if project_info else False
    ])
    
    print(f"\n🚀 実装可能性: {'✅ 実装可能' if implementation_feasible else '❌ 課題あり'}")
    
    if implementation_feasible:
        print("  次のステップ:")
        print("  1. tools/compile_to_bytecode.py スクリプト作成")
        print("  2. python_bundler.py の .pyc 対応")
        print("  3. ビルドプロセス統合")
    
    # レポートファイルに保存
    report_data = {
        'timestamp': subprocess.check_output(['date', '-u']).decode().strip(),
        'current_python': current_python,
        'pyodide_info': pyodide_info,
        'compileall_compatible': compileall_ok,
        'project_info': {
            'python_file_count': len(project_info['python_files']) if project_info else 0,
            'bundle_exists': project_info['bundle_exists'] if project_info else False,
            'bundle_size': project_info['bundle_size'] if project_info else 0
        },
        'version_compatible': version_compatible,
        'implementation_feasible': implementation_feasible
    }
    
    report_file = Path(__file__).parent / "pyodide_compatibility_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n📋 詳細レポート保存: {report_file}")
    
    return report_data

if __name__ == "__main__":
    print("🔧 Pyodide AOT バイトコード最適化 - 環境確認")
    print("Gemini提案の実装可能性を検証中...\n")
    
    try:
        report = generate_compatibility_report()
        
        if report['implementation_feasible']:
            print("\n🎉 環境確認完了！AOTバイトコード最適化の実装準備が整いました。")
        else:
            print("\n⚠️  実装前に課題を解決する必要があります。")
            
    except Exception as e:
        print(f"\n❌ 環境確認エラー: {e}")
        sys.exit(1)