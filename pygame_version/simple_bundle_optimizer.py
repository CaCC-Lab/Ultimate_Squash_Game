"""
簡易版バンドルサイズ最適化ツール
"""
import os
import re
import json
import shutil
from pathlib import Path


def analyze_file_sizes():
    """ファイルサイズを分析"""
    print("📊 ファイルサイズ分析中...")
    
    src_dir = Path("src")
    total_size = 0
    file_sizes = {}
    
    for py_file in src_dir.rglob("*.py"):
        size = py_file.stat().st_size
        total_size += size
        file_sizes[str(py_file)] = size
        
    print(f"総Pythonコードサイズ: {total_size:,} bytes")
    
    # 大きなファイルを表示
    sorted_files = sorted(file_sizes.items(), key=lambda x: x[1], reverse=True)
    print("大きなファイル:")
    for file_path, size in sorted_files:
        print(f"  {file_path}: {size:,} bytes")
        
    return total_size, file_sizes


def optimize_simple():
    """簡単な最適化"""
    print("\n🔧 簡易最適化開始...")
    
    # 出力ディレクトリ作成
    dist_dir = Path("dist")
    dist_dir.mkdir(exist_ok=True)
    
    optimized_dir = dist_dir / "src"
    optimized_dir.mkdir(parents=True, exist_ok=True)
    
    total_original = 0
    total_optimized = 0
    
    # Pythonファイルを簡易最適化
    for py_file in Path("src").rglob("*.py"):
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_size = len(content.encode('utf-8'))
        total_original += original_size
        
        # 簡易最適化
        optimized = simple_optimize_code(content)
        optimized_size = len(optimized.encode('utf-8'))
        total_optimized += optimized_size
        
        # 保存
        relative_path = py_file.relative_to(Path("src"))
        output_file = optimized_dir / relative_path
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(optimized)
            
        reduction = original_size - optimized_size
        reduction_pct = (reduction / original_size * 100) if original_size > 0 else 0
        
        print(f"  ✅ {relative_path}: {original_size} → {optimized_size} bytes (-{reduction_pct:.1f}%)")
    
    # 統計
    total_reduction = total_original - total_optimized
    reduction_pct = (total_reduction / total_original * 100) if total_original > 0 else 0
    
    print(f"\n📊 最適化結果:")
    print(f"  元のサイズ: {total_original:,} bytes")
    print(f"  最適化後: {total_optimized:,} bytes")
    print(f"  削減: {total_reduction:,} bytes ({reduction_pct:.1f}%)")
    
    return total_original, total_optimized


def simple_optimize_code(code):
    """簡単なコード最適化"""
    lines = code.split('\n')
    optimized_lines = []
    
    for line in lines:
        # 空行をスキップ
        if not line.strip():
            continue
            
        # コメント行をスキップ
        stripped = line.strip()
        if stripped.startswith('#'):
            continue
            
        # インラインコメントを削除
        if '#' in line:
            # 文字列内の#は保護
            comment_pos = line.find('#')
            before_comment = line[:comment_pos]
            
            # 簡易チェック：文字列の外の#のみ削除
            quote_count = before_comment.count('"') + before_comment.count("'")
            if quote_count % 2 == 0:  # 偶数なら文字列の外
                line = before_comment.rstrip()
                
        # 行末空白削除
        line = line.rstrip()
        
        if line:  # 非空行のみ追加
            optimized_lines.append(line)
    
    return '\n'.join(optimized_lines)


def create_minified_html():
    """HTMLファイルの最小化"""
    print("\n📦 HTMLバンドル作成中...")
    
    # ベースHTML
    base_html = Path("pyodide_game_demo.html")
    if not base_html.exists():
        print("  ⚠️ ベースHTMLファイルが見つかりません")
        return
        
    with open(base_html, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    # 最適化されたPythonコードを読み込み
    optimized_src = Path("dist/src")
    python_code = {}
    
    for py_file in optimized_src.rglob("*.py"):
        module_path = py_file.relative_to(optimized_src).with_suffix('')
        module_name = str(module_path).replace(os.sep, '.')
        
        with open(py_file, 'r', encoding='utf-8') as f:
            python_code[module_name] = f.read()
    
    # HTMLサイズ最適化
    optimized_html = minify_html(html_content)
    
    # 最適化されたバンドルを作成
    output_html = Path("dist/optimized_bundle.html")
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(optimized_html)
        
    # サイズ情報
    original_size = base_html.stat().st_size
    optimized_size = len(optimized_html.encode('utf-8'))
    reduction = original_size - optimized_size
    reduction_pct = (reduction / original_size * 100) if original_size > 0 else 0
    
    print(f"  ✅ 最適化HTML: {original_size:,} → {optimized_size:,} bytes (-{reduction_pct:.1f}%)")
    print(f"  📄 出力ファイル: {output_html}")
    
    return original_size, optimized_size


def minify_html(html):
    """HTMLを最小化"""
    # 複数の空白を1つに
    html = re.sub(r'\s+', ' ', html)
    
    # タグ間の空白を削除
    html = re.sub(r'>\s+<', '><', html)
    
    # 行頭・行末の空白を削除
    html = html.strip()
    
    return html


def create_size_report():
    """サイズレポートを作成"""
    print("\n📊 レポート作成中...")
    
    # ファイルサイズを取得
    original_total, original_files = analyze_file_sizes()
    
    # HTMLファイルサイズ
    html_sizes = {}
    for html_file in Path(".").glob("*.html"):
        html_sizes[html_file.name] = html_file.stat().st_size
        
    # distディレクトリのサイズ
    dist_sizes = {}
    dist_dir = Path("dist")
    if dist_dir.exists():
        for file in dist_dir.rglob("*"):
            if file.is_file():
                dist_sizes[str(file)] = file.stat().st_size
                
    # レポート生成
    report = f"""# バンドルサイズ最適化レポート

## 実施日時
{get_timestamp()}

## 最適化結果サマリー

### Pythonコード最適化
- **最適化手法**: コメント除去、空行削除、空白最小化
- **対象ファイル数**: {len(original_files)}個

### HTMLファイル情報
"""
    
    for html_file, size in html_sizes.items():
        report += f"- **{html_file}**: {size:,} bytes\n"
        
    if dist_sizes:
        report += "\n### 生成されたバンドル\n"
        for file_path, size in dist_sizes.items():
            report += f"- **{file_path}**: {size:,} bytes\n"
            
    report += f"""
## 最適化のベストプラクティス

### 1. コード最適化
- ✅ コメントの除去（本番環境）
- ✅ 不要な空行の削除
- ✅ 空白の最小化

### 2. 配信最適化
- 📝 推奨: gzip圧縮を有効化
- 📝 推奨: CDNの利用
- 📝 推奨: HTTPキャッシュの設定

### 3. Pyodide固有最適化
- 📝 推奨: 必要なパッケージのみロード
- 📝 推奨: WebAssemblyストリーミング
- 📝 推奨: Service Workerでキャッシュ

## 技術仕様
- **Python**: 3.12
- **Pyodide**: 0.26.4+
- **Pygame-CE**: 2.5.0
- **最適化レベル**: 基本（コメント・空白除去）

更新日時: {get_timestamp()}
"""
    
    # レポート保存
    report_file = Path("BUNDLE_OPTIMIZATION_REPORT.md")
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
        
    print(f"✅ レポート生成完了: {report_file}")
    
    return report


def get_timestamp():
    """タイムスタンプを取得"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def main():
    """メイン実行"""
    print("🚀 Ultimate Squash Game 簡易バンドル最適化")
    print("=" * 50)
    
    # 1. ファイルサイズ分析
    analyze_file_sizes()
    
    # 2. Pythonコード最適化
    optimize_simple()
    
    # 3. HTMLバンドル作成
    create_minified_html()
    
    # 4. レポート作成
    create_size_report()
    
    print("\n" + "=" * 50)
    print("✅ バンドル最適化完了！")
    
    # 最終統計表示
    dist_dir = Path("dist")
    if dist_dir.exists():
        total_dist_size = sum(f.stat().st_size for f in dist_dir.rglob("*") if f.is_file())
        print(f"\n📦 配布可能バンドルサイズ: {total_dist_size:,} bytes")


if __name__ == "__main__":
    main()