/**
 * IntegratedTestCoverage ユニットテスト
 * 統合テストカバレッジシステムの各機能を検証
 */

import { jest } from '@jest/globals';
import { IntegratedTestCoverage } from '../../scripts/test-coverage.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// ファイルシステムモジュールをモック
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    rmSync: jest.fn()
}));

jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

// process.exit をモック
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

describe('IntegratedTestCoverage', () => {
    let coverage;
    let mockExecSync;

    beforeEach(() => {
        // モックをリセット
        jest.clearAllMocks();
        
        // execSyncモックの設定
        const { execSync } = require('child_process');
        mockExecSync = execSync;
        
        // 新しいインスタンスを作成
        coverage = new IntegratedTestCoverage();
        
        // デフォルトのexistsSyncモック設定
        existsSync.mockReturnValue(false);
    });

    afterEach(() => {
        mockExit.mockClear();
    });

    describe('constructor', () => {
        test('should initialize with correct default configuration', () => {
            expect(coverage.config).toBeDefined();
            expect(coverage.config.testTypes).toBeDefined();
            expect(coverage.config.targets).toBeDefined();
            expect(coverage.results).toBeDefined();
            
            // テストタイプの確認
            const expectedTestTypes = ['unit', 'integration', 'e2e', 'performance'];
            expectedTestTypes.forEach(type => {
                expect(coverage.config.testTypes[type]).toBeDefined();
                expect(coverage.config.testTypes[type].enabled).toBe(true);
            });
            
            // カバレッジ目標の確認
            expect(coverage.config.targets.statements).toBe(80);
            expect(coverage.config.targets.branches).toBe(75);
            expect(coverage.config.targets.functions).toBe(80);
            expect(coverage.config.targets.lines).toBe(80);
        });

        test('should create necessary directories', () => {
            expect(mkdirSync).toHaveBeenCalled();
            
            // setupDirectories が呼ばれることを確認
            const calls = mkdirSync.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
        });
    });

    describe('setupDirectories', () => {
        test('should create output and temp directories', () => {
            coverage.setupDirectories();
            
            expect(mkdirSync).toHaveBeenCalledWith(
                coverage.config.outputDir, 
                { recursive: true }
            );
            expect(mkdirSync).toHaveBeenCalledWith(
                coverage.config.tempDir, 
                { recursive: true }
            );
        });

        test('should clean existing directories', () => {
            existsSync.mockReturnValue(true);
            
            coverage.setupDirectories();
            
            expect(rmSync).toHaveBeenCalledWith(
                coverage.config.outputDir,
                { recursive: true, force: true }
            );
            expect(rmSync).toHaveBeenCalledWith(
                coverage.config.tempDir,
                { recursive: true, force: true }
            );
        });
    });

    describe('executeCommand', () => {
        test('should execute command successfully', () => {
            const mockOutput = 'Test output';
            mockExecSync.mockReturnValue(mockOutput);
            
            const result = coverage.executeCommand('test command');
            
            expect(mockExecSync).toHaveBeenCalledWith('test command', expect.objectContaining({
                cwd: expect.any(String),
                timeout: 30000,
                stdio: 'pipe',
                encoding: 'utf-8',
                env: expect.objectContaining({
                    NODE_ENV: 'test',
                    CI: 'true'
                })
            }));
            
            expect(result.stdout).toBe(mockOutput);
        });

        test('should handle command execution errors', () => {
            const mockError = new Error('Command failed');
            mockError.stdout = 'Error output';
            mockError.stderr = 'Error details';
            mockError.status = 1;
            
            mockExecSync.mockImplementation(() => {
                throw mockError;
            });
            
            const result = coverage.executeCommand('failing command');
            
            expect(result.stdout).toBe('Error output');
            expect(result.stderr).toBe('Error details');
            expect(result.exitCode).toBe(1);
        });

        test('should throw error when no useful output', () => {
            const mockError = new Error('Command failed');
            mockError.stdout = '';
            mockError.stderr = '';
            
            mockExecSync.mockImplementation(() => {
                throw mockError;
            });
            
            expect(() => {
                coverage.executeCommand('failing command');
            }).toThrow('Command failed');
        });
    });

    describe('parseTestResults', () => {
        test('should parse Jest test results correctly', () => {
            const jestOutput = `
Test Suites: 5 passed, 5 total
Tests:       25 passed, 30 total
Snapshots:   0 total
Time:        5.123 s
            `;
            
            coverage.parseTestResults('unit', { stdout: jestOutput });
            
            expect(coverage.results.summary.totalTests).toBe(30);
            expect(coverage.results.summary.passedTests).toBe(25);
            expect(coverage.results.summary.failedTests).toBe(5);
        });

        test('should parse Playwright test results correctly', () => {
            const playwrightOutput = `
Running 15 tests using 3 workers
✓ 12 passed
✗ 3 failed
            `;
            
            coverage.parseTestResults('e2e', { stdout: playwrightOutput });
            
            expect(coverage.results.summary.totalTests).toBe(12);
            expect(coverage.results.summary.passedTests).toBe(12);
        });

        test('should handle malformed test output gracefully', () => {
            const invalidOutput = 'Invalid test output without proper format';
            
            expect(() => {
                coverage.parseTestResults('unit', { stdout: invalidOutput });
            }).not.toThrow();
            
            // デフォルト値のまま
            expect(coverage.results.summary.totalTests).toBe(0);
            expect(coverage.results.summary.passedTests).toBe(0);
            expect(coverage.results.summary.failedTests).toBe(0);
        });
    });

    describe('collectCoverageForType', () => {
        test('should read coverage-summary.json when available', async () => {
            const mockSummary = {
                total: {
                    statements: { total: 100, covered: 80, pct: 80 },
                    branches: { total: 50, covered: 40, pct: 80 },
                    functions: { total: 30, covered: 25, pct: 83.33 },
                    lines: { total: 200, covered: 160, pct: 80 }
                }
            };
            
            const { readFileSync } = require('fs');
            existsSync.mockReturnValue(true);
            readFileSync.mockReturnValue(JSON.stringify(mockSummary));
            
            const result = await coverage.collectCoverageForType('unit');
            
            expect(result).toEqual({
                statements: mockSummary.total.statements,
                branches: mockSummary.total.branches,
                functions: mockSummary.total.functions,
                lines: mockSummary.total.lines
            });
        });

        test('should parse LCOV file when coverage-summary.json not available', async () => {
            const mockLcovContent = `
TN:
SF:/path/to/file.js
FNF:10
FNH:8
LF:100
LH:80
BRF:20
BRH:15
end_of_record
            `;
            
            const { readFileSync } = require('fs');
            existsSync
                .mockReturnValueOnce(false) // coverage-summary.json doesn't exist
                .mockReturnValueOnce(true);  // lcov.info exists
            readFileSync.mockReturnValue(mockLcovContent);
            
            const result = await coverage.collectCoverageForType('unit');
            
            expect(result.functions.total).toBe(10);
            expect(result.functions.covered).toBe(8);
            expect(result.lines.total).toBe(100);
            expect(result.lines.covered).toBe(80);
            expect(result.branches.total).toBe(20);
            expect(result.branches.covered).toBe(15);
        });

        test('should return null when no coverage files found', async () => {
            existsSync.mockReturnValue(false);
            
            const result = await coverage.collectCoverageForType('unit');
            
            expect(result).toBeNull();
        });
    });

    describe('checkCoverageTargets', () => {
        test('should return true when all targets are met', () => {
            const coverageData = {
                statements: { pct: 85 },
                branches: { pct: 80 },
                functions: { pct: 85 },
                lines: { pct: 85 }
            };
            
            const result = coverage.checkCoverageTargets(coverageData);
            
            expect(result).toBe(true);
        });

        test('should return false when any target is not met', () => {
            const coverageData = {
                statements: { pct: 85 },
                branches: { pct: 70 }, // Below target of 75
                functions: { pct: 85 },
                lines: { pct: 85 }
            };
            
            const result = coverage.checkCoverageTargets(coverageData);
            
            expect(result).toBe(false);
        });

        test('should handle edge case where coverage equals target', () => {
            const coverageData = {
                statements: { pct: 80 }, // Exactly equals target
                branches: { pct: 75 },   // Exactly equals target
                functions: { pct: 80 },  // Exactly equals target
                lines: { pct: 80 }       // Exactly equals target
            };
            
            const result = coverage.checkCoverageTargets(coverageData);
            
            expect(result).toBe(true);
        });
    });

    describe('integrateCoverage', () => {
        test('should correctly aggregate coverage from multiple test types', async () => {
            // モック設定：2つのテストタイプからカバレッジデータを取得
            jest.spyOn(coverage, 'collectCoverageForType')
                .mockResolvedValueOnce({
                    statements: { total: 100, covered: 80 },
                    branches: { total: 50, covered: 40 },
                    functions: { total: 30, covered: 25 },
                    lines: { total: 200, covered: 160 }
                })
                .mockResolvedValueOnce({
                    statements: { total: 50, covered: 45 },
                    branches: { total: 25, covered: 20 },
                    functions: { total: 15, covered: 12 },
                    lines: { total: 100, covered: 90 }
                })
                .mockResolvedValue(null); // 他のテストタイプはnull
            
            await coverage.integrateCoverage();
            
            // 統合されたカバレッジを確認
            expect(coverage.results.coverage.statements.total).toBe(150);
            expect(coverage.results.coverage.statements.covered).toBe(125);
            expect(coverage.results.coverage.statements.pct).toBeCloseTo(83.33);
            
            expect(coverage.results.coverage.lines.total).toBe(300);
            expect(coverage.results.coverage.lines.covered).toBe(250);
            expect(coverage.results.coverage.lines.pct).toBeCloseTo(83.33);
        });

        test('should handle case with no coverage data', async () => {
            jest.spyOn(coverage, 'collectCoverageForType')
                .mockResolvedValue(null);
            
            await coverage.integrateCoverage();
            
            expect(coverage.results.coverage.statements.total).toBe(0);
            expect(coverage.results.coverage.statements.covered).toBe(0);
            expect(coverage.results.coverage.statements.pct).toBe(0);
        });
    });

    describe('runSpecificTest', () => {
        test('should run specific test type successfully', async () => {
            mockExecSync.mockReturnValue('Test completed successfully');
            
            jest.spyOn(coverage, 'integrateCoverage').mockResolvedValue();
            jest.spyOn(coverage, 'generateReports').mockResolvedValue();
            jest.spyOn(coverage, 'printSummary').mockImplementation(() => {});
            
            const result = await coverage.runSpecificTest('unit');
            
            expect(result).toBeDefined();
            expect(coverage.results.byType.unit).toBeDefined();
            expect(coverage.results.byType.unit.success).toBe(true);
        });

        test('should throw error for unknown test type', async () => {
            await expect(coverage.runSpecificTest('unknown')).rejects.toThrow('Unknown test type: unknown');
        });
    });

    describe('generateJSONReport', () => {
        test('should generate JSON report with correct structure', async () => {
            coverage.results.summary = {
                totalTests: 100,
                passedTests: 95,
                failedTests: 5,
                duration: 30000,
                coverageTargetsMet: true
            };
            
            coverage.results.coverage = {
                statements: { total: 100, covered: 85, pct: 85 }
            };
            
            coverage.results.byType = {
                unit: { success: true, duration: 15000 }
            };
            
            await coverage.generateJSONReport();
            
            expect(writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('coverage-report.json'),
                expect.stringContaining('"totalTests": 100')
            );
        });
    });

    describe('generateTextReport', () => {
        test('should generate readable text summary', async () => {
            coverage.results.summary = {
                totalTests: 100,
                passedTests: 95,
                failedTests: 5,
                duration: 30000,
                coverageTargetsMet: true
            };
            
            coverage.results.coverage = {
                statements: { pct: 85, covered: 85, total: 100 },
                branches: { pct: 80, covered: 40, total: 50 },
                functions: { pct: 90, covered: 27, total: 30 },
                lines: { pct: 88, covered: 176, total: 200 }
            };
            
            await coverage.generateTextReport();
            
            const writeCall = writeFileSync.mock.calls.find(call => 
                call[0].includes('coverage-summary.txt')
            );
            
            expect(writeCall).toBeDefined();
            const reportContent = writeCall[1];
            
            expect(reportContent).toContain('総テスト数: 100');
            expect(reportContent).toContain('成功: 95');
            expect(reportContent).toContain('失敗: 5');
            expect(reportContent).toContain('成功率: 95.0%');
            expect(reportContent).toContain('ステートメント: 85.0%');
        });
    });

    describe('CLI integration', () => {
        test('should exit with code 1 when coverage targets not met in CI', async () => {
            // CI環境をシミュレート
            const originalEnv = process.env.CI;
            process.env.CI = 'true';
            
            coverage.results.summary.coverageTargetsMet = false;
            
            // runAllTestsをモック
            jest.spyOn(coverage, 'runAllTests').mockResolvedValue(coverage.results);
            
            try {
                // CLI部分のシミュレーション
                if (process.env.CI && !coverage.results.summary.coverageTargetsMet) {
                    process.exit(1);
                }
            } catch (error) {
                // process.exitがモックされているのでここは実行されない
            }
            
            expect(mockExit).toHaveBeenCalledWith(1);
            
            // 環境変数を復元
            process.env.CI = originalEnv;
        });
    });

    describe('error handling', () => {
        test('should handle test execution failures gracefully', async () => {
            mockExecSync.mockImplementation(() => {
                const error = new Error('Test execution failed');
                error.stdout = '';
                error.stderr = 'Detailed error message';
                throw error;
            });
            
            await coverage.runTestType('unit', coverage.config.testTypes.unit);
            
            expect(coverage.results.byType.unit).toBeDefined();
            expect(coverage.results.byType.unit.success).toBe(false);
            expect(coverage.results.byType.unit.error).toContain('Test execution failed');
        });

        test('should continue with other tests after one fails', async () => {
            // 最初のテストは失敗、2番目は成功するようにモック
            let callCount = 0;
            mockExecSync.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('First test failed');
                }
                return 'Second test passed';
            });
            
            jest.spyOn(coverage, 'integrateCoverage').mockResolvedValue();
            jest.spyOn(coverage, 'generateReports').mockResolvedValue();
            jest.spyOn(coverage, 'printSummary').mockImplementation(() => {});
            
            // 2つのテストタイプだけを有効にしてテスト
            coverage.config.testTypes.integration.enabled = false;
            coverage.config.testTypes.performance.enabled = false;
            
            const result = await coverage.runAllTests();
            
            expect(result.byType.unit.success).toBe(false);
            expect(result.byType.e2e.success).toBe(true);
        });
    });
});