"""
Ultimate Squash Game バンドルサイズ最適化ツール
Phase 3A: バンドルサイズ最適化

主な最適化:
1. Pythonコードの圧縮・ミニファイ
2. 不要なインポートの削除
3. デッドコード除去
4. HTML/JavaScript統合最適化
5. 依存関係の最適化
"""
import os
import re
import json
import gzip
import base64
import shutil
from typing import Dict, List, Tuple, Set
from pathlib import Path
import ast
import subprocess


class BundleSizeOptimizer:
    """バンドルサイズ最適化クラス"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.src_dir = self.project_root / "src"
        self.output_dir = self.project_root / "dist"
        self.optimization_report = {
            'original_sizes': {},
            'optimized_sizes': {},
            'savings': {},
            'removed_items': {
                'imports': [],
                'functions': [],
                'classes': [],
                'comments': 0,
                'docstrings': 0
            },
            'bundle_info': {}
        }
        
    def analyze_bundle_size(self) -> Dict:
        """現在のバンドルサイズを分析"""
        print("📊 バンドルサイズ分析開始...")
        
        # Pythonコードサイズ
        python_files = list(self.src_dir.rglob("*.py"))
        total_python_size = 0
        python_details = {}
        
        for file in python_files:
            size = file.stat().st_size
            total_python_size += size
            python_details[str(file.relative_to(self.project_root))] = size
            
        # HTMLファイルサイズ
        html_files = list(self.project_root.glob("*.html"))
        total_html_size = 0
        html_details = {}
        
        for file in html_files:
            size = file.stat().st_size
            total_html_size += size
            html_details[file.name] = size
            
        # 分析結果
        analysis = {
            'python': {
                'total_size': total_python_size,
                'file_count': len(python_files),
                'files': python_details
            },
            'html': {
                'total_size': total_html_size,
                'file_count': len(html_files),
                'files': html_details
            },
            'total_size': total_python_size + total_html_size
        }
        
        self.optimization_report['original_sizes'] = analysis
        
        print(f"✅ 分析完了:")
        print(f"  - Pythonコード: {total_python_size:,} bytes ({len(python_files)} files)")
        print(f"  - HTMLファイル: {total_html_size:,} bytes ({len(html_files)} files)")
        print(f"  - 合計: {analysis['total_size']:,} bytes")
        
        return analysis
    
    def optimize_python_code(self):
        """Pythonコードの最適化"""
        print("\n🔧 Pythonコード最適化開始...")
        
        # 出力ディレクトリ作成
        optimized_src = self.output_dir / "src"
        optimized_src.mkdir(parents=True, exist_ok=True)
        
        for py_file in self.src_dir.rglob("*.py"):
            relative_path = py_file.relative_to(self.src_dir)
            output_file = optimized_src / relative_path
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # コード最適化
            optimized_code = self._optimize_single_file(py_file)
            
            # 最適化されたコードを保存
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(optimized_code)
                
            # サイズ比較
            original_size = py_file.stat().st_size
            optimized_size = len(optimized_code.encode('utf-8'))
            
            self.optimization_report['optimized_sizes'][str(relative_path)] = {
                'original': original_size,
                'optimized': optimized_size,
                'reduction': original_size - optimized_size,
                'percentage': ((original_size - optimized_size) / original_size * 100) if original_size > 0 else 0
            }
            
            reduction_pct = ((original_size - optimized_size) / original_size * 100) if original_size > 0 else 0
            print(f"  ✅ {relative_path}: {original_size} → {optimized_size} bytes "
                  f"(-{reduction_pct:.1f}%)")
    
    def _optimize_single_file(self, file_path: Path) -> str:
        """単一のPythonファイルを最適化"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        try:
            # ASTパースして最適化
            tree = ast.parse(content)
            
            # 不要なインポートを検出・削除
            tree = self._remove_unused_imports(tree, content)
            
            # 不要なdocstringを削除（本番環境用）
            tree = self._remove_docstrings(tree)
            
            # デッドコードを削除
            tree = self._remove_dead_code(tree)
            
            # 最適化されたコードを生成
            optimized_code = ast.unparse(tree)
            
            # コメントを削除
            optimized_code = self._remove_comments(optimized_code)
            
            # 余分な空白を削除
            optimized_code = self._minimize_whitespace(optimized_code)
            
            return optimized_code
            
        except Exception as e:
            print(f"    ⚠️ 最適化エラー ({file_path}): {e}")
            # エラー時は元のコードを返す
            return content
    
    def _remove_unused_imports(self, tree: ast.AST, original_code: str) -> ast.AST:
        """使用されていないインポートを削除"""
        # 使用されている名前を収集
        used_names = set()
        
        class NameCollector(ast.NodeVisitor):
            def visit_Name(self, node):
                used_names.add(node.id)
            def visit_Attribute(self, node):
                if isinstance(node.value, ast.Name):
                    used_names.add(node.value.id)
                
        collector = NameCollector()
        collector.visit(tree)
        
        # インポートを最適化
        new_body = []
        for node in tree.body:
            if isinstance(node, ast.Import):
                # import文の処理
                new_names = []
                for alias in node.names:
                    name = alias.asname or alias.name
                    if name in used_names or name.split('.')[0] in used_names:
                        new_names.append(alias)
                    else:
                        self.optimization_report['removed_items']['imports'].append(name)
                        
                if new_names:
                    node.names = new_names
                    new_body.append(node)
                    
            elif isinstance(node, ast.ImportFrom):
                # from ... import文の処理
                new_names = []
                for alias in node.names:
                    name = alias.asname or alias.name
                    if name in used_names:
                        new_names.append(alias)
                    else:
                        self.optimization_report['removed_items']['imports'].append(f"{node.module}.{name}")
                        
                if new_names:
                    node.names = new_names
                    new_body.append(node)
            else:
                new_body.append(node)
                
        tree.body = new_body
        return tree
    
    def _remove_docstrings(self, tree: ast.AST) -> ast.AST:
        """docstringを削除（本番環境用）"""
        class DocstringRemover(ast.NodeTransformer):
            def visit_FunctionDef(self, node):
                # 関数のdocstringを削除
                if (node.body and 
                    isinstance(node.body[0], ast.Expr) and 
                    isinstance(node.body[0].value, ast.Constant) and
                    isinstance(node.body[0].value.value, str)):
                    node.body = node.body[1:]
                    self.optimization_report['removed_items']['docstrings'] += 1
                return self.generic_visit(node)
                
            def visit_ClassDef(self, node):
                # クラスのdocstringを削除
                if (node.body and 
                    isinstance(node.body[0], ast.Expr) and 
                    isinstance(node.body[0].value, ast.Constant) and
                    isinstance(node.body[0].value.value, str)):
                    node.body = node.body[1:]
                    self.optimization_report['removed_items']['docstrings'] += 1
                return self.generic_visit(node)
                
            def visit_Module(self, node):
                # モジュールのdocstringを削除
                if (node.body and 
                    isinstance(node.body[0], ast.Expr) and 
                    isinstance(node.body[0].value, ast.Constant) and
                    isinstance(node.body[0].value.value, str)):
                    node.body = node.body[1:]
                    self.optimization_report['removed_items']['docstrings'] += 1
                return self.generic_visit(node)
                
        remover = DocstringRemover()
        tree = remover.visit(tree)
        return tree
    
    def _remove_dead_code(self, tree: ast.AST) -> ast.AST:
        """デッドコードを削除"""
        # 簡単な実装: if __name__ == "__main__": ブロックを削除
        new_body = []
        for node in tree.body:
            if isinstance(node, ast.If):
                # if __name__ == "__main__": の検出
                if (isinstance(node.test, ast.Compare) and
                    isinstance(node.test.left, ast.Name) and
                    node.test.left.id == "__name__" and
                    len(node.test.comparators) == 1 and
                    isinstance(node.test.comparators[0], ast.Constant) and
                    node.test.comparators[0].value == "__main__"):
                    # メインブロックは削除
                    continue
            new_body.append(node)
            
        tree.body = new_body
        return tree
    
    def _remove_comments(self, code: str) -> str:
        """コメントを削除"""
        lines = code.split('\n')
        new_lines = []
        
        for line in lines:
            # インラインコメントを削除
            if '#' in line:
                # 文字列内の#は削除しない
                in_string = False
                quote_char = None
                new_line = []
                
                i = 0
                while i < len(line):
                    char = line[i]
                    
                    if char in ('"', "'") and (i == 0 or line[i-1] != '\\'):
                        if not in_string:
                            in_string = True
                            quote_char = char
                        elif char == quote_char:
                            in_string = False
                            
                    if char == '#' and not in_string:
                        # コメント開始
                        self.optimization_report['removed_items']['comments'] += 1
                        break
                        
                    new_line.append(char)
                    i += 1
                    
                line = ''.join(new_line).rstrip()
                
            if line:  # 空行は除く
                new_lines.append(line)
                
        return '\n'.join(new_lines)
    
    def _minimize_whitespace(self, code: str) -> str:
        """余分な空白を最小化"""
        # 複数の空行を1つに
        code = re.sub(r'\n\s*\n\s*\n', '\n\n', code)
        
        # 行末の空白を削除
        lines = [line.rstrip() for line in code.split('\n')]
        
        return '\n'.join(lines)
    
    def create_optimized_bundle(self):
        """最適化されたバンドルを作成"""
        print("\n📦 バンドル作成開始...")
        
        # Pyodide用の統合HTMLファイルを作成
        self._create_integrated_html()
        
        # 圧縮バンドルの作成
        self._create_compressed_bundle()
        
        print("✅ バンドル作成完了")
    
    def _create_integrated_html(self):
        """Pythonコードを統合したHTMLファイルを作成"""
        # ベースとなるHTMLファイルを読み込み
        base_html = self.project_root / "pyodide_game_demo.html"
        
        if not base_html.exists():
            print("  ⚠️ ベースHTMLファイルが見つかりません")
            return
            
        with open(base_html, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        # 最適化されたPythonコードを読み込み
        python_modules = {}
        optimized_src = self.output_dir / "src"
        
        for py_file in optimized_src.rglob("*.py"):
            module_path = py_file.relative_to(optimized_src).with_suffix('')
            module_name = str(module_path).replace(os.sep, '.')
            
            with open(py_file, 'r', encoding='utf-8') as f:
                python_modules[module_name] = f.read()
                
        # Pythonコードを埋め込み
        modules_json = json.dumps(python_modules, ensure_ascii=False)
        
        # HTMLに埋め込むためのスクリプトを生成
        embed_script = f"""
<script>
// 最適化されたPythonモジュール
const OPTIMIZED_PYTHON_MODULES = {modules_json};

// Pyodide初期化時にモジュールをロード
async function loadOptimizedModules(pyodide) {{
    for (const [moduleName, moduleCode] of Object.entries(OPTIMIZED_PYTHON_MODULES)) {{
        const path = moduleName.replace(/\\./g, '/') + '.py';
        pyodide.FS.writeFile('/home/pyodide/' + path, moduleCode);
    }}
}}
</script>
"""
        
        # HTMLに埋め込み
        # </head>タグの前に挿入
        insert_pos = html_content.find('</head>')
        if insert_pos != -1:
            html_content = html_content[:insert_pos] + embed_script + html_content[insert_pos:]
            
        # 最適化されたHTMLを保存
        output_html = self.output_dir / "optimized_game.html"
        with open(output_html, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        # サイズ情報を記録
        original_size = base_html.stat().st_size
        optimized_size = len(html_content.encode('utf-8'))
        
        self.optimization_report['bundle_info']['integrated_html'] = {
            'file': str(output_html),
            'original_size': original_size,
            'optimized_size': optimized_size,
            'embedded_modules': len(python_modules)
        }
        
        print(f"  ✅ 統合HTML作成: {output_html}")
        print(f"     サイズ: {optimized_size:,} bytes ({len(python_modules)} modules embedded)")
    
    def _create_compressed_bundle(self):
        """圧縮されたバンドルを作成"""
        # distディレクトリ全体を圧縮
        bundle_name = "ultimate_squash_bundle"
        
        # tar.gz形式で圧縮
        shutil.make_archive(
            base_name=str(self.output_dir / bundle_name),
            format='gztar',
            root_dir=str(self.output_dir)
        )
        
        bundle_file = self.output_dir / f"{bundle_name}.tar.gz"
        bundle_size = bundle_file.stat().st_size
        
        # ZIP形式でも作成（互換性のため）
        shutil.make_archive(
            base_name=str(self.output_dir / bundle_name),
            format='zip',
            root_dir=str(self.output_dir)
        )
        
        zip_file = self.output_dir / f"{bundle_name}.zip"
        zip_size = zip_file.stat().st_size
        
        self.optimization_report['bundle_info']['compressed'] = {
            'tar_gz': {
                'file': str(bundle_file),
                'size': bundle_size
            },
            'zip': {
                'file': str(zip_file),
                'size': zip_size
            }
        }
        
        print(f"  ✅ 圧縮バンドル作成:")
        print(f"     - tar.gz: {bundle_size:,} bytes")
        print(f"     - zip: {zip_size:,} bytes")
    
    def generate_size_report(self):
        """サイズ最適化レポートを生成"""
        print("\n📊 最適化レポート生成...")
        
        # 総削減量を計算
        total_original = 0
        total_optimized = 0
        
        for file_info in self.optimization_report['optimized_sizes'].values():
            total_original += file_info['original']
            total_optimized += file_info['optimized']
            
        total_reduction = total_original - total_optimized
        reduction_percentage = (total_reduction / total_original * 100) if total_original > 0 else 0
        
        # レポート作成
        report = f"""# バンドルサイズ最適化レポート

## 実施日時
{self._get_timestamp()}

## サマリー

### 全体的な削減効果
- **元のサイズ**: {total_original:,} bytes
- **最適化後**: {total_optimized:,} bytes
- **削減量**: {total_reduction:,} bytes
- **削減率**: {reduction_percentage:.1f}%

### 削除された要素
- **不要なインポート**: {len(self.optimization_report['removed_items']['imports'])}個
- **docstring**: {self.optimization_report['removed_items']['docstrings']}個
- **コメント**: {self.optimization_report['removed_items']['comments']}行

## ファイル別の最適化結果

| ファイル | 元のサイズ | 最適化後 | 削減量 | 削減率 |
|---------|-----------|---------|--------|--------|
"""
        
        # ファイル別の詳細を追加
        for file_path, info in sorted(self.optimization_report['optimized_sizes'].items()):
            report += f"| {file_path} | {info['original']:,} | {info['optimized']:,} | "
            report += f"{info['reduction']:,} | {info['percentage']:.1f}% |\n"
            
        # バンドル情報を追加
        if 'bundle_info' in self.optimization_report:
            report += "\n## 生成されたバンドル\n\n"
            
            if 'integrated_html' in self.optimization_report['bundle_info']:
                html_info = self.optimization_report['bundle_info']['integrated_html']
                report += f"### 統合HTMLファイル\n"
                report += f"- **ファイル**: {html_info['file']}\n"
                report += f"- **サイズ**: {html_info['optimized_size']:,} bytes\n"
                report += f"- **埋め込みモジュール数**: {html_info['embedded_modules']}\n\n"
                
            if 'compressed' in self.optimization_report['bundle_info']:
                compressed = self.optimization_report['bundle_info']['compressed']
                report += f"### 圧縮バンドル\n"
                report += f"- **tar.gz**: {compressed['tar_gz']['size']:,} bytes\n"
                report += f"- **zip**: {compressed['zip']['size']:,} bytes\n"
        
        # 推奨事項を追加
        report += self._generate_recommendations()
        
        # レポートを保存
        report_file = self.project_root / "BUNDLE_SIZE_OPTIMIZATION_REPORT.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
            
        print(f"✅ レポート生成完了: {report_file}")
        
        return report
    
    def _generate_recommendations(self) -> str:
        """最適化の推奨事項を生成"""
        recommendations = "\n## 推奨事項\n\n"
        
        reduction_percentage = 0
        if self.optimization_report['optimized_sizes']:
            total_original = sum(info['original'] for info in self.optimization_report['optimized_sizes'].values())
            total_optimized = sum(info['optimized'] for info in self.optimization_report['optimized_sizes'].values())
            reduction_percentage = ((total_original - total_optimized) / total_original * 100) if total_original > 0 else 0
        
        if reduction_percentage < 10:
            recommendations += "### コードは既に最適化されています\n"
            recommendations += "- 現在のコードは効率的に書かれています\n"
            recommendations += "- 追加の最適化は限定的な効果しか期待できません\n\n"
        else:
            recommendations += "### さらなる最適化の余地\n"
            
            if len(self.optimization_report['removed_items']['imports']) > 10:
                recommendations += "- **インポート最適化**: 多くの未使用インポートが検出されました\n"
                recommendations += "  - 定期的なコードレビューでインポートを整理してください\n\n"
                
            if self.optimization_report['removed_items']['docstrings'] > 20:
                recommendations += "- **ドキュメント管理**: 多くのdocstringが削除されました\n"
                recommendations += "  - 開発版と本番版でドキュメントの管理を分離することを検討してください\n\n"
                
        recommendations += "### Web配信の最適化\n"
        recommendations += "- **CDN利用**: 静的ファイルはCDNから配信\n"
        recommendations += "- **gzip圧縮**: サーバーレベルでgzip圧縮を有効化\n"
        recommendations += "- **キャッシュ設定**: 適切なCache-Controlヘッダーを設定\n"
        recommendations += "- **遅延読み込み**: 必要になるまでモジュールの読み込みを遅延\n\n"
        
        recommendations += "### Pyodide固有の最適化\n"
        recommendations += "- **軽量なPyodideビルド**: 必要な機能のみを含むカスタムビルド\n"
        recommendations += "- **WebAssemblyストリーミング**: instantiateStreamingを使用\n"
        recommendations += "- **モジュールの事前コンパイル**: .pycファイルの利用\n"
        
        return recommendations
    
    def _get_timestamp(self) -> str:
        """現在のタイムスタンプを取得"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def main():
    """メイン実行関数"""
    print("🚀 Ultimate Squash Game バンドルサイズ最適化")
    print("=" * 50)
    
    optimizer = BundleSizeOptimizer()
    
    # 1. 現在のバンドルサイズ分析
    optimizer.analyze_bundle_size()
    
    # 2. Pythonコードの最適化
    optimizer.optimize_python_code()
    
    # 3. 最適化されたバンドルの作成
    optimizer.create_optimized_bundle()
    
    # 4. レポート生成
    report = optimizer.generate_size_report()
    
    print("\n" + "=" * 50)
    print("✅ バンドルサイズ最適化完了！")
    
    # 簡単なサマリーを表示
    if optimizer.optimization_report['optimized_sizes']:
        total_original = sum(info['original'] for info in optimizer.optimization_report['optimized_sizes'].values())
        total_optimized = sum(info['optimized'] for info in optimizer.optimization_report['optimized_sizes'].values())
        total_reduction = total_original - total_optimized
        reduction_percentage = (total_reduction / total_original * 100) if total_original > 0 else 0
        
        print(f"\n📉 最適化結果:")
        print(f"  元のサイズ: {total_original:,} bytes")
        print(f"  最適化後: {total_optimized:,} bytes")
        print(f"  削減: {total_reduction:,} bytes ({reduction_percentage:.1f}%)")


if __name__ == "__main__":
    main()