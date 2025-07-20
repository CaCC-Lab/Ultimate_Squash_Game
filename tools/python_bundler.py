#!/usr/bin/env python3
"""
Pyodide用Pythonコードバンドラー
Ultimate Squash Game専用最適化バンドリングツール
"""

import os
import re
import ast
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass

@dataclass
class ModuleInfo:
    """モジュール情報"""
    path: str
    imports: Set[str]
    classes: List[str]
    functions: List[str]
    dependencies: Set[str]
    size_bytes: int

class PythonBundler:
    """Pyodide最適化Pythonバンドラー"""
    
    def __init__(self, source_dir: str, output_file: str):
        self.source_dir = Path(source_dir)
        self.output_file = Path(output_file)
        self.modules: Dict[str, ModuleInfo] = {}
        self.dependency_order: List[str] = []
        
    def analyze_dependencies(self) -> Dict[str, ModuleInfo]:
        """依存関係の分析"""
        print("🔍 Pythonファイルの依存関係を分析中...")
        
        # Python ファイルを再帰的に検索
        python_files = list(self.source_dir.rglob("*.py"))
        
        for file_path in python_files:
            if file_path.name.startswith("__"):
                continue
                
            module_name = self._get_module_name(file_path)
            module_info = self._analyze_file(file_path)
            self.modules[module_name] = module_info
            
        # 依存関係順序の計算
        self._calculate_dependency_order()
        
        return self.modules
    
    def _get_module_name(self, file_path: Path) -> str:
        """ファイルパスからモジュール名を生成"""
        relative_path = file_path.relative_to(self.source_dir)
        module_parts = list(relative_path.parts[:-1])  # ディレクトリ部分
        
        if relative_path.stem != "__init__":
            module_parts.append(relative_path.stem)
            
        return ".".join(module_parts) if module_parts else "main"
    
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
        """最適化バンドルの生成"""
        print("📦 最適化バンドルを生成中...")
        
        bundle_content = []
        
        # ヘッダー
        bundle_content.append('"""')
        bundle_content.append('Ultimate Squash Game - Pyodide最適化バンドル')
        bundle_content.append('自動生成: python_bundler.py により生成')
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
        
        # Pyodide専用設定
        bundle_content.append('# === Pyodide統合 ===')
        bundle_content.append('try:')
        bundle_content.append('    import js')
        bundle_content.append('    PYODIDE_MODE = True')
        bundle_content.append('except ImportError:')
        bundle_content.append('    class MockJs:')
        bundle_content.append('        def __init__(self): pass')
        bundle_content.append('    js = MockJs()')
        bundle_content.append('    PYODIDE_MODE = False')
        bundle_content.append('')
        
        # モジュール内容を依存関係順に統合
        for module_name in self.dependency_order:
            if module_name not in self.modules:
                continue
                
            module_info = self.modules[module_name]
            bundle_content.append(f'# === {module_name} モジュール ===')
            
            # ファイル内容の読み込み
            with open(module_info.path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # インポート文の除去と最適化
            content = self._optimize_module_content(content)
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
    
    def _optimize_module_content(self, content: str) -> str:
        """モジュール内容の最適化"""
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
        """バンドリングレポートの生成"""
        total_size = sum(m.size_bytes for m in self.modules.values())
        total_classes = sum(len(m.classes) for m in self.modules.values())
        total_functions = sum(len(m.functions) for m in self.modules.values())
        
        report = []
        report.append("# Python バンドリング レポート")
        report.append("")
        report.append("## 概要")
        report.append(f"- **総モジュール数**: {len(self.modules)}")
        report.append(f"- **総サイズ**: {total_size:,} bytes ({total_size/1024:.1f} KB)")
        report.append(f"- **総クラス数**: {total_classes}")
        report.append(f"- **総関数数**: {total_functions}")
        report.append("")
        
        report.append("## モジュール詳細")
        report.append("| モジュール | サイズ | クラス | 関数 | 依存関係 |")
        report.append("|-----------|--------|--------|------|----------|")
        
        for name, info in self.modules.items():
            deps = ', '.join(info.dependencies) if info.dependencies else 'なし'
            report.append(f"| {name} | {info.size_bytes:,}B | {len(info.classes)} | {len(info.functions)} | {deps} |")
        
        report.append("")
        report.append("## 依存関係順序")
        for i, module in enumerate(self.dependency_order, 1):
            report.append(f"{i}. {module}")
            
        report.append("")
        report.append("## 最適化効果予測")
        
        # パフォーマンス改善予測
        network_savings = len(self.modules) * 50  # 平均50msのネットワークオーバーヘッド削減
        parsing_savings = total_size * 0.001     # 1KB per 1ms parsing time
        
        report.append(f"- **ネットワーク削減**: 約{network_savings}ms")
        report.append(f"- **パース時間削減**: 約{parsing_savings:.1f}ms")
        report.append(f"- **総削減予測**: 約{network_savings + parsing_savings:.1f}ms")
        
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