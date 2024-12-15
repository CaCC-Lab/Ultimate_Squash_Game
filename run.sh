#!/bin/bash

# まずpipをアップグレード
python -m pip install --upgrade pip

# SSL証明書の問題を回避するためにpipに--trusted-hostオプションを追加
python -m pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# ゲームの起動（とりあえずAI機能なしで）
python main.py