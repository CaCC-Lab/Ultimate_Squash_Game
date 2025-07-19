#!/bin/bash

# ネットワーク条件テスト実行スクリプト
# 様々なネットワーク状況でのゲーム動作を検証

set -e

echo "🌐 ネットワーク条件テスト開始"
echo "==============================="

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログディレクトリ作成
LOG_DIR="test-results/network-conditions"
mkdir -p "$LOG_DIR"

# テスト開始時刻
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "開始時刻: $START_TIME"

# サーバーが起動していることを確認
check_server() {
    echo -n "HTTPサーバー確認中... "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}NG${NC}"
        echo "HTTPサーバーが起動していません。以下のコマンドで起動してください："
        echo "python -m http.server 3000"
        exit 1
    fi
}

# WebSocketサーバー確認
check_websocket_server() {
    echo -n "WebSocketサーバー確認中... "
    if pgrep -f "python.*websocket" > /dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}WebSocketサーバーが見つかりません${NC}"
        echo "WebSocket機能のテストはスキップされます"
    fi
}

# 基本ネットワーク条件テスト実行
run_basic_network_tests() {
    echo ""
    echo -e "${BLUE}📡 基本ネットワーク条件テスト実行${NC}"
    echo "======================================"
    
    npx playwright test tests/e2e/network-conditions.spec.js \
        --project=network-conditions \
        --reporter=html \
        --output="$LOG_DIR/basic" \
        2>&1 | tee "$LOG_DIR/basic-network-test.log"
    
    local exit_code=${PIPESTATUS[0]}
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ 基本ネットワーク条件テスト完了${NC}"
    else
        echo -e "${RED}❌ 基本ネットワーク条件テストで問題発生${NC}"
    fi
    
    return $exit_code
}

# パフォーマンステスト実行
run_performance_tests() {
    echo ""
    echo -e "${BLUE}⚡ ネットワークパフォーマンステスト実行${NC}"
    echo "=========================================="
    
    npx playwright test tests/e2e/network-performance.spec.js \
        --project=network-conditions \
        --reporter=html \
        --output="$LOG_DIR/performance" \
        2>&1 | tee "$LOG_DIR/performance-test.log"
    
    local exit_code=${PIPESTATUS[0]}
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ パフォーマンステスト完了${NC}"
    else
        echo -e "${RED}❌ パフォーマンステストで問題発生${NC}"
    fi
    
    return $exit_code
}

# 特定のネットワーク条件でのテスト実行
run_specific_condition_test() {
    local condition_name="$1"
    local test_pattern="$2"
    
    echo ""
    echo -e "${BLUE}🔍 $condition_name 条件テスト実行${NC}"
    echo "==============================="
    
    npx playwright test \
        --project=network-conditions \
        --grep="$test_pattern" \
        --reporter=line \
        --output="$LOG_DIR/$condition_name" \
        2>&1 | tee "$LOG_DIR/$condition_name-test.log"
    
    local exit_code=${PIPESTATUS[0]}
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ $condition_name テスト完了${NC}"
    else
        echo -e "${RED}❌ $condition_name テストで問題発生${NC}"
    fi
    
    return $exit_code
}

# レポート生成
generate_report() {
    local total_tests="$1"
    local passed_tests="$2"
    local failed_tests="$3"
    
    echo ""
    echo -e "${BLUE}📋 テスト結果レポート生成${NC}"
    echo "=========================="
    
    local report_file="$LOG_DIR/network-test-report.md"
    
    cat > "$report_file" << EOF
# ネットワーク条件テスト結果レポート

## 実行概要
- **実行日時**: $START_TIME
- **総テスト数**: $total_tests
- **成功**: $passed_tests
- **失敗**: $failed_tests
- **成功率**: $(( passed_tests * 100 / total_tests ))%

## テスト環境
- **HTTPサーバー**: localhost:3000
- **WebSocketサーバー**: localhost:8765
- **ブラウザ**: Chromium (network-conditions project)

## 実行されたテスト

### 基本ネットワーク条件テスト
- 3G/低速WiFi環境での動作確認
- ネットワーク切断・再接続テスト
- 高レイテンシ環境でのゲーム操作性
- WebSocket接続の安定性
- パケットロス時の処理
- オフラインモードの動作

### パフォーマンステスト
- 各ネットワーク条件での読み込み時間測定
- ゲームプレイの応答性確認
- リソース読み込み失敗時の処理
- プログレッシブエンハンスメント

## 詳細ログ
- 基本テスト: \`basic-network-test.log\`
- パフォーマンステスト: \`performance-test.log\`
- 個別条件テスト: \`*-test.log\`

## 推奨改善点
EOF

    # 失敗したテストがある場合の推奨事項を追加
    if [ $failed_tests -gt 0 ]; then
        cat >> "$report_file" << EOF

### 検出された問題
1. 失敗したテストケースの詳細確認が必要
2. ネットワーク条件への適応ロジックの改善を検討
3. タイムアウト設定の調整が必要な可能性

### 次のステップ
1. \`playwright-report/index.html\` で詳細結果を確認
2. 失敗したテストのスクリーンショット・ビデオを確認
3. ログファイルでエラーの根本原因を特定
4. 必要に応じてネットワーク適応ロジックを改善
EOF
    else
        cat >> "$report_file" << EOF

### 結果
✅ すべてのネットワーク条件テストが成功しました！

ゲームは以下の条件で正常に動作することが確認されました：
- 低速ネットワーク環境（3G、低速WiFi）
- ネットワーク切断・再接続
- 高レイテンシ環境
- パケットロス発生時
- オフライン環境

### 優秀な点
1. 様々なネットワーク条件に適応している
2. オフライン時も基本機能が維持されている
3. 接続品質に応じた適切な動作調整が実装されている
EOF
    fi
    
    echo "レポートを生成しました: $report_file"
}

# メイン実行関数
main() {
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # サーバー状態確認
    check_server
    check_websocket_server
    
    echo ""
    echo -e "${YELLOW}📝 実行するテスト:${NC}"
    echo "1. 基本ネットワーク条件テスト"
    echo "2. ネットワークパフォーマンステスト"
    echo "3. 個別条件テスト"
    
    # ユーザー選択（非対話モードの場合はすべて実行）
    if [ -t 0 ]; then
        echo ""
        read -p "すべてのテストを実行しますか？ (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "テストをキャンセルしました"
            exit 0
        fi
    fi
    
    # 基本ネットワーク条件テスト
    if run_basic_network_tests; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # パフォーマンステスト
    if run_performance_tests; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    
    # 個別条件テスト
    local conditions=(
        "3G:3G"
        "slow-wifi:SLOW_WIFI"
        "offline:offline"
        "high-latency:HIGH_LATENCY"
    )
    
    for condition_info in "${conditions[@]}"; do
        IFS=':' read -r condition_name test_pattern <<< "$condition_info"
        if run_specific_condition_test "$condition_name" "$test_pattern"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
        ((total_tests++))
    done
    
    # 最終結果表示
    echo ""
    echo "=============================="
    echo -e "${BLUE}🏁 テスト実行完了${NC}"
    echo "=============================="
    echo "総テスト数: $total_tests"
    echo -e "成功: ${GREEN}$passed_tests${NC}"
    echo -e "失敗: ${RED}$failed_tests${NC}"
    echo "成功率: $(( passed_tests * 100 / total_tests ))%"
    
    # レポート生成
    generate_report "$total_tests" "$passed_tests" "$failed_tests"
    
    # HTMLレポートを開く（デスクトップ環境の場合）
    if command -v open >/dev/null 2>&1; then
        echo ""
        echo "HTMLレポートを開いています..."
        open playwright-report/index.html 2>/dev/null || true
    elif command -v xdg-open >/dev/null 2>&1; then
        echo ""
        echo "HTMLレポートを開いています..."
        xdg-open playwright-report/index.html 2>/dev/null || true
    fi
    
    # 終了コード設定
    if [ $failed_tests -gt 0 ]; then
        echo -e "${RED}⚠️ いくつかのテストが失敗しました${NC}"
        exit 1
    else
        echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
        exit 0
    fi
}

# 実行権限をチェック
if [ ! -x "$0" ]; then
    echo "実行権限を設定しています..."
    chmod +x "$0"
fi

# Ctrl+C での中断処理
trap 'echo -e "\n${YELLOW}テストが中断されました${NC}"; exit 130' INT

# メイン関数実行
main "$@"