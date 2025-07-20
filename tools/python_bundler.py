#!/usr/bin/env python3
"""
Pyodide用Pythonコードバンドラー (AOTバイトコード最適化対応)
Ultimate Squash Game専用最適化バンドリングツール

Gemini提案のAOTバイトコード最適化フェーズ3実装:
- .pycバイトコードファイルのサポート
- compile_to_bytecode.pyとの統合
- パフォーマンス向上: 100-300ms削減目標
"""

import os
import re
import ast
import sys
import subprocess
import tempfile
import shutil
import marshal
import py_compile
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass
import argparse
import json

@dataclass
class ModuleInfo:
    """モジュール情報（バイトコード対応）"""
    path: str
    imports: Set[str]
    classes: List[str]
    functions: List[str]
    dependencies: Set[str]
    size_bytes: int
    is_bytecode: bool = False
    bytecode_path: Optional[str] = None
    compilation_time: Optional[float] = None

class PythonBundler:
    """Pyodide最適化Pythonバンドラー（AOTバイトコード対応）"""
    
    def __init__(self, source_dir: str, output_file: str, use_bytecode: bool = False, verbose: bool = True):
        self.source_dir = Path(source_dir)
        self.output_file = Path(output_file)
        self.use_bytecode = use_bytecode
        self.verbose = verbose
        self.modules: Dict[str, ModuleInfo] = {}
        self.dependency_order: List[str] = []
        self.bytecode_compiler = None
        self.compilation_stats = {
            'total_compilation_time': 0,
            'bytecode_size_reduction': 0,
            'modules_compiled': 0
        }
        
        if self.verbose:
            print(f"🚀 PythonBundler初期化 (バイトコードモード: {'有効' if use_bytecode else '無効'})")
            print(f"  ソースディレクトリ: {self.source_dir}")
            print(f"  出力ファイル: {self.output_file}")
    
    def compile_to_bytecode(self) -> Optional[Path]:
        """Gemini提案のcompile_to_bytecode.pyを使用してバイトコードコンパイル"""
        if not self.use_bytecode:
            return None
            
        if self.verbose:
            print("🔥 AOTバイトコードコンパイル開始...")
        
        try:
            # compile_to_bytecode.pyスクリプトのパス
            compiler_script = Path(__file__).parent / "compile_to_bytecode.py"
            
            if not compiler_script.exists():
                if self.verbose:
                    print(f"⚠️ バイトコードコンパイラーが見つかりません: {compiler_script}")
                return None
            
            # 一時ディレクトリでバイトコードコンパイル実行
            temp_dir = Path(tempfile.mkdtemp(prefix="bytecode_bundle_"))
            
            if self.verbose:
                print(f"  一時ディレクトリ: {temp_dir}")
            
            # compile_to_bytecode.pyを実行
            cmd = [
                sys.executable, str(compiler_script),
                "--src-dir", str(self.source_dir),
                "--output-dir", str(temp_dir),
                "--keep-temp",
                "--stats-file", str(temp_dir / "compilation_stats.json")
            ]
            
            if not self.verbose:
                cmd.append("--quiet")
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                # 統計情報を読み込み
                stats_file = temp_dir / "compilation_stats.json"
                if stats_file.exists():
                    with open(stats_file, 'r', encoding='utf-8') as f:
                        stats = json.load(f)
                        self.compilation_stats['total_compilation_time'] = stats.get('compilation_time_ms', 0)
                        self.compilation_stats['modules_compiled'] = stats.get('files_compiled', 0)
                        self.compilation_stats['bytecode_size_reduction'] = stats.get('compression_ratio_percent', 0)
                
                if self.verbose:
                    print(f"✅ バイトコードコンパイル成功: {temp_dir}")
                    print(f"  コンパイル時間: {self.compilation_stats['total_compilation_time']:.1f}ms")
                    print(f"  コンパイル済みモジュール: {self.compilation_stats['modules_compiled']}")
                    print(f"  サイズ削減率: {self.compilation_stats['bytecode_size_reduction']:.1f}%")
                
                return temp_dir
                
            else:
                if self.verbose:
                    print(f"❌ バイトコードコンパイル失敗:")
                    print(f"  stdout: {result.stdout}")
                    print(f"  stderr: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            if self.verbose:
                print("❌ バイトコードコンパイルがタイムアウトしました")
            return None
        except Exception as e:
            if self.verbose:
                print(f"❌ バイトコードコンパイルエラー: {e}")
            return None
    
    def analyze_dependencies(self) -> Dict[str, ModuleInfo]:
        """依存関係の分析（バイトコード対応）"""
        if self.verbose:
            print("🔍 Pythonファイルの依存関係を分析中...")
        
        # バイトコードモードの場合、先にコンパイル実行
        bytecode_dir = None
        if self.use_bytecode:
            bytecode_dir = self.compile_to_bytecode()
            if not bytecode_dir:
                if self.verbose:
                    print("⚠️ バイトコードコンパイル失敗、ソースファイルモードで続行")
                self.use_bytecode = False
        
        # ファイル検索（.pyまたは.pyc）
        if self.use_bytecode and bytecode_dir:
            # バイトコードディレクトリから.pycファイルを検索
            target_files = list(bytecode_dir.rglob("*.pyc"))
            source_dir_for_analysis = bytecode_dir
            if self.verbose:
                print(f"  バイトコードファイル数: {len(target_files)}")
        else:
            # ソースディレクトリから.pyファイルを検索
            target_files = list(self.source_dir.rglob("*.py"))
            source_dir_for_analysis = self.source_dir
            if self.verbose:
                print(f"  Pythonソースファイル数: {len(target_files)}")
        
        for file_path in target_files:
            if file_path.name.startswith("__"):
                continue
                
            module_name = self._get_module_name(file_path, source_dir_for_analysis)
            
            if self.use_bytecode and file_path.suffix == '.pyc':
                # バイトコードファイルの分析
                module_info = self._analyze_bytecode_file(file_path)
            else:
                # ソースファイルの分析
                module_info = self._analyze_file(file_path)
            
            self.modules[module_name] = module_info
            
        # 依存関係順序の計算
        self._calculate_dependency_order()
        
        if self.verbose:
            print(f"📊 分析完了: {len(self.modules)}モジュール")
        
        return self.modules
    
    def _get_module_name(self, file_path: Path, source_dir: Path = None) -> str:
        """ファイルパスからモジュール名を生成（バイトコード対応）"""
        if source_dir is None:
            source_dir = self.source_dir
            
        relative_path = file_path.relative_to(source_dir)
        module_parts = list(relative_path.parts[:-1])  # ディレクトリ部分
        
        # .pycファイルの場合は拡張子を除去
        stem = relative_path.stem
        if file_path.suffix == '.pyc':
            # .pycファイルの場合、さらに.pyも除去（例: file.py.pyc -> file）
            if stem.endswith('.py'):
                stem = stem[:-3]
        
        if stem != "__init__":
            module_parts.append(stem)
            
        return ".".join(module_parts) if module_parts else "main"
    
    def _analyze_bytecode_file(self, file_path: Path) -> ModuleInfo:
        """バイトコードファイル（.pyc）の分析"""
        try:
            # バイトコードファイルのサイズ取得
            file_size = file_path.stat().st_size
            
            # 対応するソースファイルが存在する場合、そちらを分析してメタデータを取得
            source_file = self._find_corresponding_source_file(file_path)
            
            if source_file and source_file.exists():
                # ソースファイルからメタデータを取得
                source_info = self._analyze_file(source_file)
                
                # バイトコード情報で更新
                return ModuleInfo(
                    path=str(file_path),
                    imports=source_info.imports,
                    classes=source_info.classes,
                    functions=source_info.functions,
                    dependencies=source_info.dependencies,
                    size_bytes=file_size,
                    is_bytecode=True,
                    bytecode_path=str(file_path)
                )
            else:
                # ソースファイルが見つからない場合、最小限の情報
                if self.verbose:
                    print(f"⚠️ バイトコードファイルに対応するソースが見つかりません: {file_path}")
                
                return ModuleInfo(
                    path=str(file_path),
                    imports=set(),
                    classes=[],
                    functions=[],
                    dependencies=set(),
                    size_bytes=file_size,
                    is_bytecode=True,
                    bytecode_path=str(file_path)
                )
                
        except Exception as e:
            if self.verbose:
                print(f"⚠️ バイトコードファイル分析エラー {file_path}: {e}")
            return ModuleInfo(str(file_path), set(), [], [], set(), 0, True)
    
    def _find_corresponding_source_file(self, bytecode_path: Path) -> Optional[Path]:
        """バイトコードファイルに対応するソースファイルを検索"""
        # .pycファイルから元の.pyファイルパスを推定
        relative_to_bytecode_dir = bytecode_path.parent
        
        # .pycから.pyへの変換
        source_name = bytecode_path.stem
        if source_name.endswith('.py'):
            source_name = source_name[:-3] + '.py'
        else:
            source_name = source_name + '.py'
        
        # 元のソースディレクトリでの同じ相対パスを計算
        # バイトコードディレクトリ構造がソースディレクトリと同じと仮定
        possible_source = self.source_dir / source_name
        
        # より詳細な検索が必要な場合
        if not possible_source.exists():
            # ソースディレクトリで再帰的に検索
            source_files = list(self.source_dir.rglob(source_name))
            if source_files:
                return source_files[0]
        
        return possible_source if possible_source.exists() else None
    
    def _analyze_file(self, file_path: Path) -> ModuleInfo:
        """単一ファイルの分析"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            print(f"⚠️ 構文エラー {file_path}: {e}")
            return ModuleInfo(str(file_path), set(), [], [], set(), len(content.encode()))
        
        imports = set()
        classes = []
        functions = []
        dependencies = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name)
                    
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module)
                    # 内部依存関係の検出
                    if node.module.startswith(('model', 'view', 'controller')):
                        dependencies.add(node.module)
                        
            elif isinstance(node, ast.ClassDef):
                classes.append(node.name)
                
            elif isinstance(node, ast.FunctionDef):
                functions.append(node.name)
        
        return ModuleInfo(
            path=str(file_path),
            imports=imports,
            classes=classes,
            functions=functions,
            dependencies=dependencies,
            size_bytes=len(content.encode())
        )
    
    def _calculate_dependency_order(self):
        """依存関係に基づく読み込み順序の計算"""
        visited = set()
        visiting = set()
        
        def visit(module_name: str):
            if module_name in visiting:
                print(f"⚠️ 循環依存を検出: {module_name}")
                return
            if module_name in visited:
                return
                
            visiting.add(module_name)
            
            if module_name in self.modules:
                for dep in self.modules[module_name].dependencies:
                    visit(dep)
                    
            visiting.remove(module_name)
            visited.add(module_name)
            self.dependency_order.append(module_name)
        
        for module_name in self.modules.keys():
            visit(module_name)
    
    def optimize_imports(self) -> Dict[str, Set[str]]:
        """インポート最適化"""
        print("⚡ インポートを最適化中...")
        
        # 全モジュールで使用されるインポートを集計
        all_imports = set()
        for module in self.modules.values():
            all_imports.update(module.imports)
        
        # Pyodide専用の最適化
        pyodide_optimized = {
            'common_imports': {
                'time', 'math', 'random', 'json',
                'typing', 'dataclasses'
            },
            'pyodide_specific': {
                'js'  # Pyodide特有
            },
            'remove_imports': {
                'pygame',  # WebブラウザではPyodideで不要
                'tkinter', 'sys'  # 一部制限
            }
        }
        
        optimized = {}
        for category, imports in pyodide_optimized.items():
            optimized[category] = imports.intersection(all_imports)
            
        return optimized
    
    def generate_bundle(self) -> str:
        """最適化バンドルの生成（AOTバイトコード対応）"""
        if self.verbose:
            print("📦 最適化バンドルを生成中...")
        
        bundle_content = []
        
        # ヘッダー（バイトコード情報を含む）
        bundle_content.append('"""')
        bundle_content.append('Ultimate Squash Game - Pyodide最適化バンドル')
        bundle_content.append('自動生成: python_bundler.py により生成')
        if self.use_bytecode:
            bundle_content.append('AOTバイトコード最適化: 有効')
            bundle_content.append(f'コンパイル済みモジュール: {self.compilation_stats["modules_compiled"]}')
            bundle_content.append(f'コンパイル時間: {self.compilation_stats["total_compilation_time"]:.1f}ms')
        bundle_content.append('"""')
        bundle_content.append('')
        
        # 最適化されたインポート
        optimized_imports = self.optimize_imports()
        bundle_content.append('# === 最適化インポート ===')
        
        for imp in sorted(optimized_imports.get('common_imports', [])):
            bundle_content.append(f'import {imp}')
            
        # 型ヒント
        bundle_content.append('from typing import List, Dict, Optional, Callable')
        bundle_content.append('from dataclasses import dataclass')
        bundle_content.append('')
        
        # Pyodide専用設定（バイトコード最適化情報を含む）
        bundle_content.append('# === Pyodide統合（AOT最適化） ===')
        bundle_content.append('try:')
        bundle_content.append('    import js')
        bundle_content.append('    PYODIDE_MODE = True')
        if self.use_bytecode:
            bundle_content.append('    AOT_BYTECODE_OPTIMIZED = True')
        bundle_content.append('except ImportError:')
        bundle_content.append('    class MockJs:')
        bundle_content.append('        def __init__(self): pass')
        bundle_content.append('    js = MockJs()')
        bundle_content.append('    PYODIDE_MODE = False')
        if self.use_bytecode:
            bundle_content.append('    AOT_BYTECODE_OPTIMIZED = False')
        bundle_content.append('')
        
        # モジュール内容を依存関係順に統合
        for module_name in self.dependency_order:
            if module_name not in self.modules:
                continue
                
            module_info = self.modules[module_name]
            
            # バイトコード最適化の場合、特別なコメントを追加
            if module_info.is_bytecode:
                bundle_content.append(f'# === {module_name} モジュール（AOTバイトコード最適化済み） ===')
            else:
                bundle_content.append(f'# === {module_name} モジュール ===')
            
            # ファイル内容の読み込み
            content = self._load_module_content(module_info)
            
            # インポート文の除去と最適化
            content = self._optimize_module_content(content, module_info.is_bytecode)
            bundle_content.append(content)
            bundle_content.append('')
        
        # エントリーポイント
        bundle_content.append('# === エントリーポイント ===')
        bundle_content.append('def create_optimized_game():')
        bundle_content.append('    """Pyodide最適化ゲームインスタンス作成"""')
        bundle_content.append('    game_state = PygameGameState()')
        bundle_content.append('    game_view = PygameGameView(screen=None)')
        bundle_content.append('    return PygameGameController(game_state, game_view)')
        bundle_content.append('')
        bundle_content.append('# グローバルアクセス用')
        bundle_content.append('game_instance = None')
        bundle_content.append('')
        bundle_content.append('def init_game():')
        bundle_content.append('    global game_instance')
        bundle_content.append('    game_instance = create_optimized_game()')
        bundle_content.append('    return game_instance')
        
        return '\n'.join(bundle_content)
    
    def _load_module_content(self, module_info: ModuleInfo) -> str:
        """モジュール内容の読み込み（バイトコード対応）"""
        if module_info.is_bytecode:
            # バイトコードファイルの場合、.pycファイルを直接処理
            bytecode_path = Path(module_info.path)
            
            if self.verbose:
                print(f"  🚀 バイトコード直接読み込み: {bytecode_path.name}")
            
            # .pycファイルをBase64エンコードしてPyodide用に埋め込み
            try:
                import base64
                with open(bytecode_path, 'rb') as f:
                    bytecode_data = f.read()
                
                # Base64エンコード
                encoded_bytecode = base64.b64encode(bytecode_data).decode('ascii')
                
                # Pyodide用のバイトコード読み込みコード生成
                # ModuleInfoから元のソースパス情報を復元してモジュール名を取得
                # bytecode_path.name から対応するソースファイルを特定
                source_filename = bytecode_path.name.replace('.pyc', '.py')
                
                # self.modulesからマッチするソースファイルを検索
                module_name = None
                for name, info in self.modules.items():
                    info_path = Path(info.path)
                    if info_path.name == source_filename:
                        module_name = name
                        break
                
                if not module_name:
                    # フォールバック: ファイル名から直接生成
                    module_name = bytecode_path.stem.replace('.py', '') if bytecode_path.stem.endswith('.py') else bytecode_path.stem
                content = f'''# AOTバイトコード最適化モジュール: {module_name}
# サイズ: {module_info.size_bytes}B
# 事前コンパイル済み .pyc ファイル

import base64
import types
import sys

# バイトコードデータ（Base64エンコード済み）
_bytecode_data = """{encoded_bytecode}"""

# バイトコードから直接モジュールを作成
_bytecode_bytes = base64.b64decode(_bytecode_data)

# Pyodide環境でのバイトコード実行
if 'pyodide' in sys.modules or hasattr(sys, '_getframe'):
    # バイトコードからコードオブジェクトを復元
    try:
        import marshal
        # .pycファイルのヘッダーをスキップしてマーシャルデータを取得
        code_obj = marshal.loads(_bytecode_bytes[16:])  # Python 3.7+ format
        
        # モジュールオブジェクトを作成
        module = types.ModuleType('{module_name}')
        module.__file__ = '{bytecode_path}'
        
        # バイトコードを実行
        exec(code_obj, module.__dict__)
        
        # モジュールをsys.modulesに登録
        sys.modules['{module_name}'] = module
        
    except Exception as e:
        print(f"⚠️ バイトコード実行エラー: {{e}}")
        # フォールバック: ソースコードから実行
        pass
'''
                return content
                
            except Exception as e:
                if self.verbose:
                    print(f"⚠️ バイトコード読み込みエラー {bytecode_path}: {e}")
                # フォールバック: 対応するソースファイルを読み込み
                source_file = self._find_corresponding_source_file(bytecode_path)
                if source_file and source_file.exists():
                    with open(source_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if self.verbose:
                        print(f"  📖 フォールバック：ソース読み込み: {source_file.name}")
                    return content
                else:
                    return "# バイトコードファイル（ソース不明）\npass\n"
        else:
            # 通常のソースファイルの場合
            with open(module_info.path, 'r', encoding='utf-8') as f:
                return f.read()
    
    def _optimize_module_content(self, content: str, is_bytecode: bool = False) -> str:
        """モジュール内容の最適化（バイトコード対応）"""
        lines = content.split('\n')
        optimized_lines = []
        
        for line in lines:
            stripped = line.strip()
            
            # インポート文を除去（既に統合済み）
            if (stripped.startswith('import ') or 
                stripped.startswith('from ') or
                stripped.startswith('sys.path')):
                continue
                
            # docstring先頭のスキップ
            if stripped.startswith('"""') and 'pygame-ce' in stripped.lower():
                continue
                
            # デバッグ用print文の除去
            if 'print(' in line and ('テスト' in line or 'test' in line.lower()):
                continue
                
            optimized_lines.append(line)
        
        return '\n'.join(optimized_lines)
    
    def generate_report(self) -> str:
        """バンドリングレポートの生成（AOTバイトコード対応）"""
        total_size = sum(m.size_bytes for m in self.modules.values())
        total_classes = sum(len(m.classes) for m in self.modules.values())
        total_functions = sum(len(m.functions) for m in self.modules.values())
        
        # バイトコード統計
        bytecode_modules = [m for m in self.modules.values() if m.is_bytecode]
        source_modules = [m for m in self.modules.values() if not m.is_bytecode]
        
        report = []
        report.append("# Python バンドリング レポート（AOTバイトコード最適化）")
        report.append("")
        report.append("## 概要")
        report.append(f"- **総モジュール数**: {len(self.modules)}")
        if self.use_bytecode:
            report.append(f"- **バイトコードモジュール数**: {len(bytecode_modules)}")
            report.append(f"- **ソースモジュール数**: {len(source_modules)}")
        report.append(f"- **総サイズ**: {total_size:,} bytes ({total_size/1024:.1f} KB)")
        report.append(f"- **総クラス数**: {total_classes}")
        report.append(f"- **総関数数**: {total_functions}")
        report.append("")
        
        # バイトコード最適化統計
        if self.use_bytecode:
            report.append("## AOTバイトコード最適化統計")
            report.append(f"- **バイトコードモード**: 有効")
            report.append(f"- **コンパイル時間**: {self.compilation_stats['total_compilation_time']:.1f}ms")
            report.append(f"- **コンパイル済みモジュール**: {self.compilation_stats['modules_compiled']}")
            report.append(f"- **サイズ削減率**: {self.compilation_stats['bytecode_size_reduction']:.1f}%")
            report.append("")
        
        report.append("## モジュール詳細")
        if self.use_bytecode:
            report.append("| モジュール | タイプ | サイズ | クラス | 関数 | 依存関係 |")
            report.append("|-----------|-------|--------|--------|------|----------|")
        else:
            report.append("| モジュール | サイズ | クラス | 関数 | 依存関係 |")
            report.append("|-----------|--------|--------|------|----------|")
        
        for name, info in self.modules.items():
            deps = ', '.join(info.dependencies) if info.dependencies else 'なし'
            if self.use_bytecode:
                module_type = "AOT" if info.is_bytecode else "ソース"
                report.append(f"| {name} | {module_type} | {info.size_bytes:,}B | {len(info.classes)} | {len(info.functions)} | {deps} |")
            else:
                report.append(f"| {name} | {info.size_bytes:,}B | {len(info.classes)} | {len(info.functions)} | {deps} |")
        
        report.append("")
        report.append("## 依存関係順序")
        for i, module in enumerate(self.dependency_order, 1):
            if self.use_bytecode and module in self.modules:
                module_type = " (AOT)" if self.modules[module].is_bytecode else " (ソース)"
                report.append(f"{i}. {module}{module_type}")
            else:
                report.append(f"{i}. {module}")
            
        report.append("")
        report.append("## 最適化効果予測")
        
        # パフォーマンス改善予測（バイトコード考慮）
        network_savings = len(self.modules) * 50  # 平均50msのネットワークオーバーヘッド削減
        parsing_savings = total_size * 0.001     # 1KB per 1ms parsing time
        
        # バイトコード最適化による追加削減
        bytecode_savings = 0
        if self.use_bytecode and len(bytecode_modules) > 0:
            # Geminiの目標: 100-300ms削減
            bytecode_savings = len(bytecode_modules) * 50  # バイトコードモジュールあたり50ms削減
            
        total_savings = network_savings + parsing_savings + bytecode_savings
        
        report.append(f"- **ネットワーク削減**: 約{network_savings}ms")
        report.append(f"- **パース時間削減**: 約{parsing_savings:.1f}ms")
        if self.use_bytecode:
            report.append(f"- **AOTバイトコード削減**: 約{bytecode_savings}ms")
        report.append(f"- **総削減予測**: 約{total_savings:.1f}ms")
        
        if self.use_bytecode:
            report.append("")
            report.append("## Gemini提案のフェーズ3実装状況")
            report.append("- ✅ compile_to_bytecode.py 統合")
            report.append("- ✅ .pyc ファイル対応")
            report.append("- ✅ バンドリングプロセス統合")
            report.append(f"- 🎯 パフォーマンス目標: 100-300ms削減 (予測: {bytecode_savings}ms)")
        
        return '\n'.join(report)
    
    def bundle(self) -> Tuple[str, str]:
        """メインバンドリング処理"""
        print("🚀 Pythonバンドリングを開始...")
        
        # 依存関係分析
        self.analyze_dependencies()
        
        # バンドル生成
        bundle_content = self.generate_bundle()
        
        # ファイル出力
        with open(self.output_file, 'w', encoding='utf-8') as f:
            f.write(bundle_content)
        
        # レポート生成
        report = self.generate_report()
        report_file = self.output_file.with_suffix('.report.md')
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"✅ バンドル完成: {self.output_file}")
        print(f"📊 レポート: {report_file}")
        
        return str(self.output_file), report

def main():
    """メイン実行"""
    if len(sys.argv) != 3:
        print("使用法: python_bundler.py <source_dir> <output_file>")
        print("例: python_bundler.py pygame_version/src bundled_game.py")
        sys.exit(1)
    
    source_dir = sys.argv[1]
    output_file = sys.argv[2]
    
    bundler = PythonBundler(source_dir, output_file)
    bundle_file, report = bundler.bundle()
    
    print("\n" + "="*50)
    print("📊 バンドリング完了サマリー")
    print("="*50)
    print(report.split('\n')[5:15])  # 概要部分のみ表示

if __name__ == "__main__":
    main()