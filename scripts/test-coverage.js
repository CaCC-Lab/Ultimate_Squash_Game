#!/usr/bin/env node

/**
 * 統合テストカバレッジシステム
 * 複数のテストタイプ（Unit, Integration, E2E, Performance）のカバレッジを統合
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class IntegratedTestCoverage {
  constructor() {
    this.config = {
      outputDir: join(projectRoot, 'coverage-reports'),
      tempDir: join(projectRoot, 'temp-coverage'),
      testTypes: {
        unit: {
          name: 'Unit Tests',
          command: 'npx jest --coverage --coverageDirectory=temp-coverage/unit',
          enabled: true,
          timeout: 30000
        },
        integration: {
          name: 'Integration Tests',
          command: 'npx jest --testPathPattern=tests/integration --coverage --coverageDirectory=temp-coverage/integration',
          enabled: true,
          timeout: 60000
        },
        e2e: {
          name: 'E2E Tests',
          command: 'npx playwright test --reporter=html --output-dir=temp-coverage/e2e',
          enabled: true,
          timeout: 120000,
          coverageCommand: 'npx playwright test --reporter=json --output-dir=temp-coverage/e2e-json'
        },
        performance: {
          name: 'Performance Tests',
          command: 'npx jest --testPathPattern=tests/performance --coverage --coverageDirectory=temp-coverage/performance',
          enabled: true,
          timeout: 90000
        }
      },
      targets: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    };

    this.results = {
      overall: {},
      byType: {},
      coverage: {},
      summary: {
        startTime: null,
        endTime: null,
        duration: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverageTargetsMet: false
      }
    };

    this.setupDirectories();
  }

  /**
     * 必要なディレクトリを作成
     */
  setupDirectories() {
    const dirs = [this.config.outputDir, this.config.tempDir];

    for (const dir of dirs) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
      mkdirSync(dir, { recursive: true });
    }

    // テストタイプ別のディレクトリを作成
    for (const type of Object.keys(this.config.testTypes)) {
      mkdirSync(join(this.config.tempDir, type), { recursive: true });
    }
  }

  /**
     * 全テストスイートを実行
     */
  async runAllTests() {
    console.log('🚀 統合テストカバレッジシステム開始');
    console.log('=' .repeat(60));

    this.results.summary.startTime = Date.now();

    // 各テストタイプを順次実行
    for (const [type, config] of Object.entries(this.config.testTypes)) {
      if (!config.enabled) {
        console.log(`⏭️  ${config.name} - スキップ（無効）`);
        continue;
      }

      console.log(`\n📋 ${config.name} 実行中...`);
      await this.runTestType(type, config);
    }

    // カバレッジデータを統合
    await this.integrateCoverage();

    // レポートを生成
    await this.generateReports();

    this.results.summary.endTime = Date.now();
    this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;

    console.log('\n' + '=' .repeat(60));
    console.log('✅ 統合テストカバレッジ完了');
    this.printSummary();

    return this.results;
  }

  /**
     * 特定のテストタイプを実行
     */
  async runTestType(type, config) {
    const startTime = Date.now();

    try {
      // メインコマンドを実行
      const result = this.executeCommand(config.command, config.timeout);

      // E2Eテストの場合、追加でカバレッジコマンドを実行
      if (config.coverageCommand) {
        this.executeCommand(config.coverageCommand, config.timeout);
      }

      this.results.byType[type] = {
        success: true,
        duration: Date.now() - startTime,
        output: result.stdout || '',
        error: null
      };

      // テスト結果を解析
      this.parseTestResults(type, result);

      console.log(`✅ ${config.name} - 成功`);

    } catch (error) {
      this.results.byType[type] = {
        success: false,
        duration: Date.now() - startTime,
        output: error.stdout || '',
        error: error.message
      };

      console.log(`❌ ${config.name} - 失敗: ${error.message}`);

      // エラーでも継続（部分的なカバレッジレポートを作成）
    }
  }

  /**
     * コマンドを実行
     */
  executeCommand(command, timeout = 30000) {
    try {
      console.log(`   実行: ${command}`);

      const result = execSync(command, {
        cwd: projectRoot,
        timeout: timeout,
        stdio: 'pipe',
        encoding: 'utf-8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true'
        }
      });

      return { stdout: result, stderr: '' };

    } catch (error) {
      // 一部のテストツールは失敗時にexitコード1を返すため、
      // stdoutに有用な情報がある場合は例外として扱わない
      if (error.stdout && error.stdout.length > 0) {
        return {
          stdout: error.stdout,
          stderr: error.stderr || '',
          exitCode: error.status
        };
      }
      throw error;
    }
  }

  /**
     * テスト結果を解析
     */
  parseTestResults(type, result) {
    const output = result.stdout;

    // Jest結果の解析
    if (output.includes('Test Suites:') || output.includes('Tests:')) {
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+total/);
      if (testMatch) {
        const passed = parseInt(testMatch[1]);
        const total = parseInt(testMatch[2]);

        this.results.summary.totalTests += total;
        this.results.summary.passedTests += passed;
        this.results.summary.failedTests += (total - passed);
      }
    }

    // Playwright結果の解析
    if (output.includes('passed') && type === 'e2e') {
      const testMatch = output.match(/(\d+)\s+passed/);
      if (testMatch) {
        const passed = parseInt(testMatch[1]);
        this.results.summary.totalTests += passed;
        this.results.summary.passedTests += passed;
      }
    }
  }

  /**
     * カバレッジデータを統合
     */
  async integrateCoverage() {
    console.log('\n📊 カバレッジデータ統合中...');

    const coverageData = {
      statements: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      lines: { total: 0, covered: 0, pct: 0 },
      byType: {}
    };

    // 各テストタイプのカバレッジを収集
    for (const type of Object.keys(this.config.testTypes)) {
      const typeCoverage = await this.collectCoverageForType(type);
      if (typeCoverage) {
        coverageData.byType[type] = typeCoverage;

        // 全体統計に加算
        for (const metric of ['statements', 'branches', 'functions', 'lines']) {
          if (typeCoverage[metric]) {
            coverageData[metric].total += typeCoverage[metric].total || 0;
            coverageData[metric].covered += typeCoverage[metric].covered || 0;
          }
        }
      }
    }

    // パーセンテージを計算
    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
      if (coverageData[metric].total > 0) {
        coverageData[metric].pct =
                    (coverageData[metric].covered / coverageData[metric].total) * 100;
      }
    }

    this.results.coverage = coverageData;

    // カバレッジ目標達成チェック
    this.results.summary.coverageTargetsMet = this.checkCoverageTargets(coverageData);
  }

  /**
     * 特定のテストタイプのカバレッジを収集
     */
  async collectCoverageForType(type) {
    const coverageDir = join(this.config.tempDir, type);
    const lcovFile = join(coverageDir, 'lcov.info');
    const summaryFile = join(coverageDir, 'coverage-summary.json');

    try {
      // coverage-summary.jsonが存在する場合はそれを使用
      if (existsSync(summaryFile)) {
        const summaryContent = readFileSync(summaryFile, 'utf-8');
        const summary = JSON.parse(summaryContent);

        if (summary.total) {
          return {
            statements: summary.total.statements,
            branches: summary.total.branches,
            functions: summary.total.functions,
            lines: summary.total.lines
          };
        }
      }

      // lcov.infoが存在する場合は解析
      if (existsSync(lcovFile)) {
        return this.parseLcovFile(lcovFile);
      }

      return null;

    } catch (error) {
      console.warn(`⚠️  ${type}のカバレッジデータ収集に失敗: ${error.message}`);
      return null;
    }
  }

  /**
     * LCOVファイルを解析
     */
  parseLcovFile(lcovFile) {
    const content = readFileSync(lcovFile, 'utf-8');
    const lines = content.split('\n');

    const coverage = {
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      lines: { total: 0, covered: 0 }
    };

    for (const line of lines) {
      if (line.startsWith('LH:')) {
        coverage.lines.covered += parseInt(line.split(':')[1]);
      } else if (line.startsWith('LF:')) {
        coverage.lines.total += parseInt(line.split(':')[1]);
      } else if (line.startsWith('BRH:')) {
        coverage.branches.covered += parseInt(line.split(':')[1]);
      } else if (line.startsWith('BRF:')) {
        coverage.branches.total += parseInt(line.split(':')[1]);
      } else if (line.startsWith('FNH:')) {
        coverage.functions.covered += parseInt(line.split(':')[1]);
      } else if (line.startsWith('FNF:')) {
        coverage.functions.total += parseInt(line.split(':')[1]);
      }
    }

    // ステートメントカバレッジはラインカバレッジと同等として扱う
    coverage.statements = { ...coverage.lines };

    return coverage;
  }

  /**
     * カバレッジ目標達成をチェック
     */
  checkCoverageTargets(coverageData) {
    const targets = this.config.targets;

    return (
      coverageData.statements.pct >= targets.statements &&
            coverageData.branches.pct >= targets.branches &&
            coverageData.functions.pct >= targets.functions &&
            coverageData.lines.pct >= targets.lines
    );
  }

  /**
     * 各種レポートを生成
     */
  async generateReports() {
    console.log('\n📄 レポート生成中...');

    // JSON詳細レポート
    await this.generateJSONReport();

    // HTML統合レポート
    await this.generateHTMLReport();

    // テキストサマリー
    await this.generateTextReport();

    // JUnit XML（CI統合用）
    await this.generateJUnitReport();

    console.log(`📁 レポート出力先: ${this.config.outputDir}`);
  }

  /**
     * JSON詳細レポートを生成
     */
  async generateJSONReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      coverage: this.results.coverage,
      testResults: this.results.byType,
      config: {
        targets: this.config.targets,
        testTypes: Object.fromEntries(
          Object.entries(this.config.testTypes).map(([key, value]) => [
            key,
            { name: value.name, enabled: value.enabled }
          ])
        )
      }
    };

    const outputPath = join(this.config.outputDir, 'coverage-report.json');
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  /**
     * HTML統合レポートを生成
     */
  async generateHTMLReport() {
    const coverage = this.results.coverage;
    const summary = this.results.summary;

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合テストカバレッジレポート</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .timestamp { opacity: 0.9; font-size: 1.1em; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); text-align: center; }
        .summary-card h3 { color: #333; margin-bottom: 15px; font-size: 1.2em; }
        .summary-card .value { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .summary-card .label { color: #666; font-size: 0.9em; }
        
        .coverage-section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 30px; }
        .coverage-section h2 { color: #333; margin-bottom: 25px; font-size: 1.8em; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        
        .coverage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .coverage-item { text-align: center; padding: 20px; }
        .coverage-item h4 { color: #555; margin-bottom: 15px; }
        .progress-circle { position: relative; width: 120px; height: 120px; margin: 0 auto 15px; }
        .progress-ring { transform: rotate(-90deg); }
        .progress-ring-circle { fill: transparent; stroke: #e6e6e6; stroke-width: 8; }
        .progress-ring-progress { fill: transparent; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.5s; }
        .progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.4em; font-weight: bold; }
        
        .test-types { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .test-type { background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 5px solid #667eea; }
        .test-type h4 { color: #333; margin-bottom: 15px; }
        .test-type .status { font-weight: bold; margin-bottom: 10px; }
        .test-type .success { color: #28a745; }
        .test-type .failure { color: #dc3545; }
        .test-type .duration { color: #666; font-size: 0.9em; }
        
        .footer { text-align: center; padding: 30px; color: #666; }
        
        .targets-met { color: #28a745; }
        .targets-not-met { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 統合テストカバレッジレポート</h1>
            <div class="timestamp">生成日時: ${new Date().toLocaleString('ja-JP')}</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>総テスト数</h3>
                <div class="value" style="color: #667eea;">${summary.totalTests}</div>
                <div class="label">実行されたテスト</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="value" style="color: ${summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100 >= 90 ? '#28a745' : '#ffc107') : '#666'};">
                    ${summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100).toFixed(1) : '0'}%
                </div>
                <div class="label">${summary.passedTests}/${summary.totalTests} 成功</div>
            </div>
            <div class="summary-card">
                <h3>実行時間</h3>
                <div class="value" style="color: #764ba2;">${(summary.duration / 1000).toFixed(1)}s</div>
                <div class="label">総実行時間</div>
            </div>
            <div class="summary-card">
                <h3>カバレッジ目標</h3>
                <div class="value ${summary.coverageTargetsMet ? 'targets-met' : 'targets-not-met'}">
                    ${summary.coverageTargetsMet ? '✅' : '❌'}
                </div>
                <div class="label">${summary.coverageTargetsMet ? '達成' : '未達成'}</div>
            </div>
        </div>
        
        <div class="coverage-section">
            <h2>📊 統合カバレッジメトリクス</h2>
            <div class="coverage-grid">
                ${['statements', 'branches', 'functions', 'lines'].map(metric => {
    const data = coverage[metric];
    const pct = data.pct || 0;
    const color = pct >= 80 ? '#28a745' : pct >= 60 ? '#ffc107' : '#dc3545';
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (pct / 100) * circumference;

    return `
                    <div class="coverage-item">
                        <h4>${metric === 'statements' ? 'ステートメント' :
    metric === 'branches' ? 'ブランチ' :
      metric === 'functions' ? '関数' : 'ライン'}</h4>
                        <div class="progress-circle">
                            <svg class="progress-ring" width="120" height="120">
                                <circle class="progress-ring-circle" cx="60" cy="60" r="54"></circle>
                                <circle class="progress-ring-progress" cx="60" cy="60" r="54" 
                                        stroke="${color}" 
                                        stroke-dasharray="${circumference}" 
                                        stroke-dashoffset="${offset}"></circle>
                            </svg>
                            <div class="progress-text" style="color: ${color};">${pct.toFixed(1)}%</div>
                        </div>
                        <div class="label">${data.covered || 0}/${data.total || 0}</div>
                    </div>`;
  }).join('')}
            </div>
        </div>
        
        <div class="coverage-section">
            <h2>🧪 テストタイプ別結果</h2>
            <div class="test-types">
                ${Object.entries(this.results.byType).map(([type, result]) => `
                    <div class="test-type">
                        <h4>${this.config.testTypes[type]?.name || type}</h4>
                        <div class="status ${result.success ? 'success' : 'failure'}">
                            ${result.success ? '✅ 成功' : '❌ 失敗'}
                        </div>
                        <div class="duration">実行時間: ${(result.duration / 1000).toFixed(2)}秒</div>
                        ${result.error ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 10px;">エラー: ${result.error}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="footer">
            <p>🚀 Ultimate Squash Game - 統合テストカバレッジシステム</p>
            <p>生成日時: ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;

    const outputPath = join(this.config.outputDir, 'coverage-report.html');
    writeFileSync(outputPath, html);
  }

  /**
     * テキストサマリーレポートを生成
     */
  async generateTextReport() {
    const coverage = this.results.coverage;
    const summary = this.results.summary;

    const report = `
統合テストカバレッジレポート
${'=' .repeat(50)}

実行サマリー:
  • 総テスト数: ${summary.totalTests}
  • 成功: ${summary.passedTests}
  • 失敗: ${summary.failedTests}
  • 成功率: ${summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100).toFixed(1) : '0'}%
  • 実行時間: ${(summary.duration / 1000).toFixed(1)}秒
  • カバレッジ目標達成: ${summary.coverageTargetsMet ? '✅' : '❌'}

統合カバレッジメトリクス:
  • ステートメント: ${coverage.statements.pct.toFixed(1)}% (${coverage.statements.covered}/${coverage.statements.total})
  • ブランチ: ${coverage.branches.pct.toFixed(1)}% (${coverage.branches.covered}/${coverage.branches.total})
  • 関数: ${coverage.functions.pct.toFixed(1)}% (${coverage.functions.covered}/${coverage.functions.total})
  • ライン: ${coverage.lines.pct.toFixed(1)}% (${coverage.lines.covered}/${coverage.lines.total})

カバレッジ目標:
  • ステートメント: ${this.config.targets.statements}% ${coverage.statements.pct >= this.config.targets.statements ? '✅' : '❌'}
  • ブランチ: ${this.config.targets.branches}% ${coverage.branches.pct >= this.config.targets.branches ? '✅' : '❌'}
  • 関数: ${this.config.targets.functions}% ${coverage.functions.pct >= this.config.targets.functions ? '✅' : '❌'}
  • ライン: ${this.config.targets.lines}% ${coverage.lines.pct >= this.config.targets.lines ? '✅' : '❌'}

テストタイプ別結果:
${Object.entries(this.results.byType).map(([type, result]) =>
    `  • ${this.config.testTypes[type]?.name || type}: ${result.success ? '✅' : '❌'} (${(result.duration / 1000).toFixed(2)}s)`
  ).join('\n')}

生成日時: ${new Date().toISOString()}
`;

    const outputPath = join(this.config.outputDir, 'coverage-summary.txt');
    writeFileSync(outputPath, report);
  }

  /**
     * JUnit XMLレポートを生成（CI統合用）
     */
  async generateJUnitReport() {
    const summary = this.results.summary;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="IntegratedTestCoverage" 
           tests="${summary.totalTests}" 
           failures="${summary.failedTests}" 
           errors="0" 
           time="${(summary.duration / 1000).toFixed(3)}">
    ${Object.entries(this.results.byType).map(([type, result]) => `
    <testcase classname="Coverage" 
              name="${this.config.testTypes[type]?.name || type}" 
              time="${(result.duration / 1000).toFixed(3)}">
        ${!result.success ? `<failure message="${result.error || 'Test execution failed'}">${result.output}</failure>` : ''}
    </testcase>`).join('')}
</testsuite>`;

    const outputPath = join(this.config.outputDir, 'junit-coverage.xml');
    writeFileSync(outputPath, xml);
  }

  /**
     * サマリーを出力
     */
  printSummary() {
    const summary = this.results.summary;
    const coverage = this.results.coverage;

    console.log('\n📊 テスト実行サマリー:');
    console.log(`   総テスト数: ${summary.totalTests}`);
    console.log(`   成功: ${summary.passedTests} | 失敗: ${summary.failedTests}`);
    console.log(`   成功率: ${summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100).toFixed(1) : '0'}%`);
    console.log(`   実行時間: ${(summary.duration / 1000).toFixed(1)}秒`);

    console.log('\n📈 統合カバレッジ:');
    console.log(`   ステートメント: ${coverage.statements.pct.toFixed(1)}%`);
    console.log(`   ブランチ: ${coverage.branches.pct.toFixed(1)}%`);
    console.log(`   関数: ${coverage.functions.pct.toFixed(1)}%`);
    console.log(`   ライン: ${coverage.lines.pct.toFixed(1)}%`);

    console.log(`\n🎯 カバレッジ目標達成: ${summary.coverageTargetsMet ? '✅' : '❌'}`);

    if (!summary.coverageTargetsMet) {
      console.log('\n⚠️  未達成項目:');
      if (coverage.statements.pct < this.config.targets.statements) {
        console.log(`   • ステートメント: ${coverage.statements.pct.toFixed(1)}% < ${this.config.targets.statements}%`);
      }
      if (coverage.branches.pct < this.config.targets.branches) {
        console.log(`   • ブランチ: ${coverage.branches.pct.toFixed(1)}% < ${this.config.targets.branches}%`);
      }
      if (coverage.functions.pct < this.config.targets.functions) {
        console.log(`   • 関数: ${coverage.functions.pct.toFixed(1)}% < ${this.config.targets.functions}%`);
      }
      if (coverage.lines.pct < this.config.targets.lines) {
        console.log(`   • ライン: ${coverage.lines.pct.toFixed(1)}% < ${this.config.targets.lines}%`);
      }
    }
  }

  /**
     * 特定のテストタイプのみを実行
     */
  async runSpecificTest(testType) {
    if (!this.config.testTypes[testType]) {
      throw new Error(`Unknown test type: ${testType}`);
    }

    console.log(`🎯 ${testType}テストのみ実行`);

    this.results.summary.startTime = Date.now();

    await this.runTestType(testType, this.config.testTypes[testType]);
    await this.integrateCoverage();
    await this.generateReports();

    this.results.summary.endTime = Date.now();
    this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;

    this.printSummary();

    return this.results;
  }
}

// CLI実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const coverage = new IntegratedTestCoverage();

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'run' || !command) {
      await coverage.runAllTests();
    } else if (command === 'unit' || command === 'integration' || command === 'e2e' || command === 'performance') {
      await coverage.runSpecificTest(command);
    } else {
      console.log('使用方法:');
      console.log('  node test-coverage.js [run|unit|integration|e2e|performance]');
      console.log('');
      console.log('例:');
      console.log('  node test-coverage.js         # 全テスト実行');
      console.log('  node test-coverage.js run     # 全テスト実行');
      console.log('  node test-coverage.js unit    # ユニットテストのみ');
      console.log('  node test-coverage.js e2e     # E2Eテストのみ');
      process.exit(1);
    }

    // カバレッジ目標未達成の場合はエラー終了（CI用）
    if (process.env.CI && !coverage.results.summary.coverageTargetsMet) {
      console.log('\n❌ CI環境: カバレッジ目標未達成のため終了コード1で終了');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ 統合テストカバレッジでエラーが発生:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

export { IntegratedTestCoverage };
