#!/usr/bin/env python3
"""
Python バイトコードコンパイラー
Gemini提案のAOTバイトコード最適化 - 第2段階

src/ ディレクトリのPythonファイルを .pyc バイトコードにコンパイルし、
既存のバンドリングプロセスと統合する
"""

import os
import sys
import shutil
import tempfile
import compileall
import py_compile
import json
from pathlib import Path
from typing import List, Dict, Any
import argparse
import time

class BytecodeCompiler:
    """Pythonソースコードをバイトコードにコンパイルするクラス"""
    
    def __init__(self, src_dir: Path, temp_dir: Path = None, verbose: bool = True):
        self.src_dir = Path(src_dir)
        self.temp_dir = Path(temp_dir) if temp_dir else Path(tempfile.mkdtemp(prefix="pyc_compile_"))
        self.verbose = verbose
        self.compilation_stats = {
            'start_time': None,
            'end_time': None,
            'files_processed': 0,
            'files_compiled': 0,
            'files_failed': 0,
            'total_source_size': 0,
            'total_bytecode_size': 0,
            'errors': []
        }
        
        if self.verbose:
            print(f"📦 BytecodeCompiler初期化")
            print(f"  ソースディレクトリ: {self.src_dir}")
            print(f"  一時ディレクトリ: {self.temp_dir}")
    
    def find_python_files(self) -> List[Path]:
        """ソースディレクトリからPythonファイルを検索"""
        if not self.src_dir.exists():
            raise FileNotFoundError(f"ソースディレクトリが見つかりません: {self.src_dir}")
        
        python_files = list(self.src_dir.rglob("*.py"))
        
        if self.verbose:
            print(f"🔍 {len(python_files)}個のPythonファイルを発見:")
            for py_file in python_files:
                rel_path = py_file.relative_to(self.src_dir)
                size = py_file.stat().st_size
                print(f"    {rel_path} ({size:,} bytes)")
        
        return python_files
    
    def create_directory_structure(self, python_files: List[Path]) -> None:
        """一時ディレクトリに元のディレクトリ構造を再現"""
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # ディレクトリ構造を作成
        for py_file in python_files:
            rel_path = py_file.relative_to(self.src_dir)
            target_dir = self.temp_dir / rel_path.parent
            target_dir.mkdir(parents=True, exist_ok=True)
        
        if self.verbose:
            print(f"📁 ディレクトリ構造を {self.temp_dir} に作成")
    
    def copy_source_files(self, python_files: List[Path]) -> List[Path]:
        """Pythonファイルを一時ディレクトリにコピー"""
        copied_files = []
        
        for py_file in python_files:
            rel_path = py_file.relative_to(self.src_dir)
            target_file = self.temp_dir / rel_path
            
            shutil.copy2(py_file, target_file)
            copied_files.append(target_file)
            
            # 統計更新
            self.compilation_stats['total_source_size'] += py_file.stat().st_size
        
        if self.verbose:
            print(f"📋 {len(copied_files)}個のファイルをコピー完了")
        
        return copied_files
    
    def compile_file(self, py_file: Path) -> bool:
        """単一のPythonファイルをバイトコードにコンパイル"""
        try:
            # .pycファイルのパスを決定
            pyc_file = py_file.with_suffix('.pyc')
            
            # コンパイル実行
            py_compile.compile(str(py_file), str(pyc_file), doraise=True)
            
            # 元の.pyファイルを削除
            py_file.unlink()
            
            # 統計更新
            if pyc_file.exists():
                self.compilation_stats['total_bytecode_size'] += pyc_file.stat().st_size
            
            return True
            
        except Exception as e:
            error_msg = f"コンパイルエラー {py_file}: {e}"
            self.compilation_stats['errors'].append(error_msg)
            if self.verbose:
                print(f"  ❌ {error_msg}")
            return False
    
    def compile_all_files(self, copied_files: List[Path]) -> None:
        """すべてのPythonファイルをコンパイル"""
        if self.verbose:
            print(f"🔥 バイトコードコンパイル開始...")
        
        for py_file in copied_files:
            self.compilation_stats['files_processed'] += 1
            
            if self.compile_file(py_file):
                self.compilation_stats['files_compiled'] += 1
                if self.verbose:
                    rel_path = py_file.relative_to(self.temp_dir)
                    print(f"  ✅ {rel_path}")
            else:
                self.compilation_stats['files_failed'] += 1
    
    def verify_compilation(self) -> bool:
        """コンパイル結果を検証"""
        # .pycファイルの数を確認
        pyc_files = list(self.temp_dir.rglob("*.pyc"))
        py_files_remaining = list(self.temp_dir.rglob("*.py"))
        
        if self.verbose:
            print(f"🔍 コンパイル検証:")
            print(f"  生成された.pycファイル: {len(pyc_files)}")
            print(f"  残っている.pyファイル: {len(py_files_remaining)}")
        
        # 基本的な検証: .pycファイルが生成されている
        success = len(pyc_files) > 0 and len(pyc_files) >= (self.compilation_stats['files_compiled'])
        
        if success and self.verbose:
            print("  ✅ コンパイル検証成功")
        elif not success:
            print("  ❌ コンパイル検証失敗")
        
        return success
    
    def generate_statistics(self) -> Dict[str, Any]:
        """コンパイル統計を生成"""
        total_time = self.compilation_stats['end_time'] - self.compilation_stats['start_time']
        compression_ratio = 0
        
        if self.compilation_stats['total_source_size'] > 0:
            compression_ratio = (1 - self.compilation_stats['total_bytecode_size'] / 
                               self.compilation_stats['total_source_size']) * 100
        
        stats = {
            **self.compilation_stats,
            'compilation_time_ms': total_time * 1000,
            'compression_ratio_percent': compression_ratio,
            'success_rate_percent': (self.compilation_stats['files_compiled'] / 
                                   max(self.compilation_stats['files_processed'], 1)) * 100
        }
        
        return stats
    
    def compile(self) -> Dict[str, Any]:
        """メインのコンパイル処理"""
        self.compilation_stats['start_time'] = time.time()
        
        try:
            # 1. Pythonファイルを検索
            python_files = self.find_python_files()
            
            # 2. ディレクトリ構造作成
            self.create_directory_structure(python_files)
            
            # 3. ソースファイルをコピー
            copied_files = self.copy_source_files(python_files)
            
            # 4. バイトコードにコンパイル
            self.compile_all_files(copied_files)
            
            # 5. コンパイル結果を検証
            verification_success = self.verify_compilation()
            
            self.compilation_stats['end_time'] = time.time()
            
            # 6. 統計生成
            stats = self.generate_statistics()
            
            if self.verbose:
                self.print_summary(stats)
            
            return {
                'success': verification_success,
                'output_dir': self.temp_dir,
                'statistics': stats
            }
            
        except Exception as e:
            self.compilation_stats['end_time'] = time.time()
            error_msg = f"コンパイル処理エラー: {e}"
            self.compilation_stats['errors'].append(error_msg)
            
            if self.verbose:
                print(f"❌ {error_msg}")
            
            return {
                'success': False,
                'error': error_msg,
                'statistics': self.generate_statistics()
            }
    
    def print_summary(self, stats: Dict[str, Any]) -> None:
        """コンパイル結果サマリーを表示"""
        print("\n" + "="*50)
        print("📊 バイトコードコンパイル結果")
        print("="*50)
        print(f"処理ファイル数: {stats['files_processed']}")
        print(f"成功: {stats['files_compiled']}")
        print(f"失敗: {stats['files_failed']}")
        print(f"成功率: {stats['success_rate_percent']:.1f}%")
        print(f"コンパイル時間: {stats['compilation_time_ms']:.1f}ms")
        print(f"ソースサイズ: {stats['total_source_size']:,} bytes")
        print(f"バイトコードサイズ: {stats['total_bytecode_size']:,} bytes")
        print(f"圧縮率: {stats['compression_ratio_percent']:.1f}%")
        
        if stats['errors']:
            print(f"\n⚠️ エラー ({len(stats['errors'])}件):")
            for error in stats['errors']:
                print(f"  - {error}")
    
    def cleanup(self) -> None:
        """一時ディレクトリをクリーンアップ"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
            if self.verbose:
                print(f"🧹 一時ディレクトリをクリーンアップ: {self.temp_dir}")

def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description='Python ソースコードをバイトコードにコンパイル')
    parser.add_argument('--src-dir', default='src', help='ソースディレクトリ (デフォルト: src)')
    parser.add_argument('--output-dir', help='出力ディレクトリ (デフォルト: 一時ディレクトリ)')
    parser.add_argument('--keep-temp', action='store_true', help='一時ディレクトリを保持')
    parser.add_argument('--quiet', action='store_true', help='詳細出力を抑制')
    parser.add_argument('--stats-file', help='統計情報の保存先JSONファイル')
    
    args = parser.parse_args()
    
    # パス解決
    project_root = Path(__file__).parent.parent
    src_dir = project_root / args.src_dir
    output_dir = Path(args.output_dir) if args.output_dir else None
    
    print("🚀 Gemini提案のAOTバイトコード最適化")
    print(f"📁 ソースディレクトリ: {src_dir}")
    
    # コンパイラ初期化
    compiler = BytecodeCompiler(
        src_dir=src_dir, 
        temp_dir=output_dir,
        verbose=not args.quiet
    )
    
    try:
        # コンパイル実行
        result = compiler.compile()
        
        if result['success']:
            print(f"\n✅ バイトコードコンパイル成功！")
            print(f"📦 出力ディレクトリ: {result['output_dir']}")
            
            # 統計情報の保存
            if args.stats_file:
                stats_path = Path(args.stats_file)
                with open(stats_path, 'w', encoding='utf-8') as f:
                    json.dump(result['statistics'], f, indent=2, ensure_ascii=False)
                print(f"📊 統計情報保存: {stats_path}")
            
            # python_bundler.py との統合のためのヒント
            if not args.quiet:
                print(f"\n💡 次のステップ:")
                print(f"   1. python_bundler.py を修正して {result['output_dir']} の.pycファイルを処理")
                print(f"   2. バンドルプロセスで --bytecode オプションを使用")
                print(f"   3. パフォーマンス測定を実行")
            
        else:
            print(f"\n❌ バイトコードコンパイル失敗")
            if 'error' in result:
                print(f"エラー: {result['error']}")
            sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n⏹️ ユーザーによって中断されました")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 予期しないエラー: {e}")
        sys.exit(1)
    finally:
        # クリーンアップ（--keep-temp が指定されていない場合）
        if not args.keep_temp and not args.output_dir:
            compiler.cleanup()

if __name__ == "__main__":
    main()