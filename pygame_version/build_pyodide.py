#!/usr/bin/env python3
"""
Pyodide/WASM環境用のビルドスクリプト
srcディレクトリのPythonファイルを結合してPyodide環境で実行できるようにする
"""

import os
import shutil
import zipfile
from pathlib import Path

def build_pyodide_bundle():
    """Pyodide用にファイルをバンドル"""
    
    # ビルドディレクトリの準備
    build_dir = Path("build")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    # srcディレクトリのコピー
    src_dir = Path("src")
    if src_dir.exists():
        shutil.copytree(src_dir, build_dir / "src")
    
    # main.pyのコピー
    shutil.copy("main.py", build_dir / "main.py")
    
    # index.htmlのコピー
    shutil.copy("index.html", build_dir / "index.html")
    
    # ZIPファイルの作成（オプション）
    with zipfile.ZipFile("ultimate_squash_pyodide.zip", "w") as zf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                if file.endswith(".py") or file.endswith(".html"):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, build_dir)
                    zf.write(file_path, arcname)
    
    print("ビルド完了:")
    print(f"- ビルドディレクトリ: {build_dir}")
    print(f"- ZIPファイル: ultimate_squash_pyodide.zip")
    print("\nHTTPサーバーを起動してテスト:")
    print("  cd build && python -m http.server 8000")

if __name__ == "__main__":
    build_pyodide_bundle()