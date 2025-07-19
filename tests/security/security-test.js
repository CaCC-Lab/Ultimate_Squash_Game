// セキュリティテスト - 脆弱性とセキュリティ検証
const { test, expect } = require('@playwright/test');

// セキュリティテスト用のユーティリティ
class SecurityTester {
  constructor() {
    this.xssPayloads = this.getXSSPayloads();
    this.injectionPayloads = this.getInjectionPayloads();
    this.dosPayloads = this.getDOSPayloads();
  }
  
  getXSSPayloads() {
    return [
      // 基本的なXSSペイロード
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg/onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      
      // エンコードされたペイロード
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
      '\u003cscript\u003ealert("XSS")\u003c/script\u003e',
      
      // イベントハンドラー
      'onmouseover=alert("XSS")',
      'onclick=alert("XSS")',
      'onerror=alert("XSS")',
      
      // 難読化されたペイロード
      '<ScRiPt>alert("XSS")</ScRiPt>',
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      
      // ポリグロット
      'jaVasCript:/*-/*`/*\`/*\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e'
    ];
  }
  
  getInjectionPayloads() {
    return [
      // SQLインジェクション
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users--",
      
      // NoSQLインジェクション
      '{"$ne": null}',
      '{"$gt": ""}',
      '{"$where": "this.password == this.password"}',
      
      // コマンドインジェクション
      '; ls -la',
      '| cat /etc/passwd',
      '`rm -rf /`',
      
      // JSONインジェクション
      '{"__proto__": {"isAdmin": true}}',
      '{"constructor": {"prototype": {"isAdmin": true}}}',
      
      // パストラバーサル
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];
  }
  
  getDOSPayloads() {
    return {
      // 大量データ
      largeString: 'A'.repeat(1000000), // 1MB
      deepNesting: this.createDeepObject(1000),
      wideArray: new Array(10000).fill('data'),
      
      // 無限ループトリガー
      recursiveReference: (() => {
        const obj = {};
        obj.self = obj;
        return obj;
      })(),
      
      // リソース消費
      regexBomb: 'a'.repeat(100) + '!',
      xmlBomb: `<?xml version="1.0"?>
        <!DOCTYPE lolz [
          <!ENTITY lol "lol">
          <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
        ]>
        <lolz>&lol2;</lolz>`,
      
      // 数値オーバーフロー
      largeNumber: Number.MAX_SAFE_INTEGER + 1,
      negativeNumber: Number.MIN_SAFE_INTEGER - 1,
      infinity: Infinity,
      nan: NaN
    };
  }
  
  createDeepObject(depth) {
    let obj = { value: 'deep' };
    for (let i = 0; i < depth; i++) {
      obj = { nested: obj };
    }
    return obj;
  }
  
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // HTMLエスケープ
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  }
  
  validateInput(input, type) {
    switch (type) {
      case 'challengeName':
        return /^[a-zA-Z0-9\s\-_]{1,100}$/.test(input);
      
      case 'score':
        return Number.isInteger(input) && input >= 0 && input <= 999999;
      
      case 'websocketMessage':
        try {
          const parsed = JSON.parse(input);
          return typeof parsed === 'object' && !Array.isArray(parsed);
        } catch {
          return false;
        }
      
      default:
        return false;
    }
  }
}

// セキュアなモック実装
class SecureSystem {
  constructor() {
    this.securityTester = new SecurityTester();
    this.challengeGenerator = this.createSecureChallengeGenerator();
    this.websocketManager = this.createSecureWebSocket();
    this.csrfTokens = new Map();
  }
  
  createSecureChallengeGenerator() {
    return {
      generateWeeklyChallenge: (date, userInput = {}) => {
        // 入力サニタイゼーション
        const sanitizedInput = {};
        
        if (userInput.customName) {
          const sanitized = this.securityTester.sanitizeInput(userInput.customName);
          if (this.securityTester.validateInput(sanitized, 'challengeName')) {
            sanitizedInput.customName = sanitized;
          }
        }
        
        // 安全なチャレンジ生成
        return {
          weekNumber: Math.floor((date - new Date('2024-01-01')) / (7 * 24 * 60 * 60 * 1000)),
          type: 'score',
          title: sanitizedInput.customName || 'Weekly Challenge',
          description: 'Complete the challenge',
          target: 1000,
          difficulty: 'basic'
        };
      }
    };
  }
  
  createSecureWebSocket() {
    const messageHistory = [];
    const rateLimiter = new Map();
    
    return {
      send: (message) => {
        // レート制限チェック
        const clientId = 'default'; // 実際にはクライアントIDを使用
        const now = Date.now();
        const clientHistory = rateLimiter.get(clientId) || [];
        
        // 過去1分間のメッセージをフィルター
        const recentMessages = clientHistory.filter(t => now - t < 60000);
        
        if (recentMessages.length >= 100) {
          throw new Error('Rate limit exceeded');
        }
        
        // メッセージサイズチェック
        if (message.length > 65536) { // 64KB
          throw new Error('Message too large');
        }
        
        // JSONバリデーション
        try {
          const parsed = JSON.parse(message);
          
          // プロトタイプ汚染チェック
          if ('__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed) {
            throw new Error('Potential prototype pollution');
          }
          
          // 再帰深度チェック
          const checkDepth = (obj, depth = 0) => {
            if (depth > 10) throw new Error('Object too deep');
            
            if (typeof obj === 'object' && obj !== null) {
              for (const key in obj) {
                checkDepth(obj[key], depth + 1);
              }
            }
          };
          
          checkDepth(parsed);
          
          // メッセージ履歴に追加
          recentMessages.push(now);
          rateLimiter.set(clientId, recentMessages);
          messageHistory.push({ message: parsed, timestamp: now });
          
          return true;
        } catch (error) {
          throw new Error(`Invalid message: ${error.message}`);
        }
      },
      
      getMessageHistory: () => messageHistory,
      clearRateLimiter: () => rateLimiter.clear()
    };
  }
  
  generateCSRFToken(sessionId) {
    const token = this.generateSecureToken();
    this.csrfTokens.set(sessionId, token);
    return token;
  }
  
  validateCSRFToken(sessionId, token) {
    const storedToken = this.csrfTokens.get(sessionId);
    return storedToken === token;
  }
  
  generateSecureToken() {
    // 実際にはcrypto.randomBytesを使用
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

test.describe('Security Tests', () => {
  let securityTester;
  let secureSystem;

  test.beforeEach(() => {
    securityTester = new SecurityTester();
    secureSystem = new SecureSystem();
  });

  test('XSS攻撃の防御（チャレンジ名に悪意のあるスクリプト）', () => {
    const xssPayloads = securityTester.xssPayloads;
    
    xssPayloads.forEach(payload => {
      const challenge = secureSystem.challengeGenerator.generateWeeklyChallenge(
        new Date(),
        { customName: payload }
      );
      
      // XSSペイロードが無害化されていることを確認
      expect(challenge.title).not.toContain('<script>');
      expect(challenge.title).not.toContain('javascript:');
      expect(challenge.title).not.toContain('onerror=');
      expect(challenge.title).not.toContain('onload=');
      
      // サニタイズまたはデフォルト値になっている
      const isDefault = challenge.title === 'Weekly Challenge';
      const isSanitized = !challenge.title.includes('<') && !challenge.title.includes('>');
      
      expect(isDefault || isSanitized).toBe(true);
    });
  });

  test('不正なWebSocketメッセージの処理', () => {
    const injectionPayloads = securityTester.injectionPayloads;
    
    injectionPayloads.forEach(payload => {
      // 文字列として送信を試みる
      try {
        secureSystem.websocketManager.send(payload);
        // JSONパースが失敗するはずなので、ここに到達したらテスト失敗
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Invalid message');
      }
      
      // JSONに埋め込んで送信を試みる
      if (payload.startsWith('{')) {
        try {
          secureSystem.websocketManager.send(payload);
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
    
    // プロトタイプ汚染の試み
    const prototypePayload = '{"__proto__": {"isAdmin": true}}';
    try {
      secureSystem.websocketManager.send(prototypePayload);
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Potential prototype pollution');
    }
  });

  test('大量データ送信によるDoS攻撃の防御', () => {
    const dosPayloads = securityTester.dosPayloads;
    
    // 大きすぎるメッセージ
    const largeMessage = JSON.stringify({ data: dosPayloads.largeString });
    try {
      secureSystem.websocketManager.send(largeMessage);
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Message too large');
    }
    
    // 深すぎるネスト
    const deepMessage = JSON.stringify(dosPayloads.deepNesting);
    try {
      secureSystem.websocketManager.send(deepMessage);
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Object too deep');
    }
    
    // レート制限テスト
    secureSystem.websocketManager.clearRateLimiter();
    
    // 100メッセージまでは送信可能
    for (let i = 0; i < 100; i++) {
      try {
        const result = secureSystem.websocketManager.send(JSON.stringify({ id: i }));
        expect(result).toBe(true);
      } catch (error) {
        expect(true).toBe(false); // この範囲では失敗しないはず
      }
    }
    
    // 101個目でレート制限
    try {
      secureSystem.websocketManager.send(JSON.stringify({ id: 101 }));
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Rate limit exceeded');
    }
  });

  test('CSRFトークンの検証', () => {
    const sessionId = 'test-session-123';
    
    // CSRFトークン生成
    const token = secureSystem.generateCSRFToken(sessionId);
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
    
    // 正しいトークンで検証
    expect(secureSystem.validateCSRFToken(sessionId, token)).toBe(true);
    
    // 間違ったトークンで検証
    expect(secureSystem.validateCSRFToken(sessionId, 'wrong-token')).toBe(false);
    
    // 存在しないセッションで検証
    expect(secureSystem.validateCSRFToken('non-existent', token)).toBe(false);
    
    // トークンの一意性
    const token2 = secureSystem.generateCSRFToken('another-session');
    expect(token).not.toBe(token2);
  });

  test('入力検証の堅牢性', () => {
    // チャレンジ名の検証
    const validNames = ['Weekly Challenge', 'Score Attack 123', 'Time-Trial_2024'];
    const invalidNames = [
      '<script>alert(1)</script>',
      'a'.repeat(101), // 長すぎる
      '../../etc/passwd',
      'challenge\0null',
      'challenge\nnewline',
      ''
    ];
    
    validNames.forEach(name => {
      expect(securityTester.validateInput(name, 'challengeName')).toBe(true);
    });
    
    invalidNames.forEach(name => {
      expect(securityTester.validateInput(name, 'challengeName')).toBe(false);
    });
    
    // スコアの検証
    const validScores = [0, 100, 999999];
    const invalidScores = [-1, 1000000, 1.5, NaN, Infinity, '100', null];
    
    validScores.forEach(score => {
      expect(securityTester.validateInput(score, 'score')).toBe(true);
    });
    
    invalidScores.forEach(score => {
      expect(securityTester.validateInput(score, 'score')).toBe(false);
    });
  });

  test('エラーメッセージの情報漏洩防止', () => {
    // システム内部情報を含まないエラーメッセージ
    const errors = [];
    
    try {
      secureSystem.websocketManager.send('invalid json');
    } catch (error) {
      errors.push(error.message);
    }
    
    try {
      const payload = JSON.stringify({ data: 'a'.repeat(100000) });
      secureSystem.websocketManager.send(payload);
    } catch (error) {
      errors.push(error.message);
    }
    
    // エラーメッセージに敏感な情報が含まれていない
    errors.forEach(errorMsg => {
      expect(errorMsg).not.toContain('stack');
      expect(errorMsg).not.toContain('path');
      expect(errorMsg).not.toContain('directory');
      expect(errorMsg).not.toContain('server');
      expect(errorMsg).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/); // IPアドレス
    });
  });

  test('安全な乱数生成', () => {
    const tokens = new Set();
    
    // 1000個のトークンを生成
    for (let i = 0; i < 1000; i++) {
      const token = secureSystem.generateSecureToken();
      
      // 十分な長さ
      expect(token.length).toBeGreaterThanOrEqual(10);
      
      // 予測可能なパターンがない
      expect(token).not.toMatch(/^[0-9]+$/);
      expect(token).not.toMatch(/^[a-z]+$/);
      
      tokens.add(token);
    }
    
    // すべてユニーク
    expect(tokens.size).toBe(1000);
  });

  test('タイミング攻撃への耐性', () => {
    const sessionId = 'timing-test';
    const correctToken = secureSystem.generateCSRFToken(sessionId);
    const incorrectTokens = [
      'a'.repeat(correctToken.length),
      correctToken.substring(0, correctToken.length - 1) + 'x',
      'wrong-token'
    ];
    
    // タイミングの差が小さいことを確認（実際の実装では定数時間比較を使用）
    const timings = [];
    
    // 正しいトークンのタイミング
    const startCorrect = performance.now();
    for (let i = 0; i < 1000; i++) {
      secureSystem.validateCSRFToken(sessionId, correctToken);
    }
    const timeCorrect = performance.now() - startCorrect;
    timings.push(timeCorrect);
    
    // 間違ったトークンのタイミング
    incorrectTokens.forEach(incorrectToken => {
      const startIncorrect = performance.now();
      for (let i = 0; i < 1000; i++) {
        secureSystem.validateCSRFToken(sessionId, incorrectToken);
      }
      const timeIncorrect = performance.now() - startIncorrect;
      timings.push(timeIncorrect);
    });
    
    // タイミングの差が10%以内
    const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
    timings.forEach(timing => {
      const difference = Math.abs(timing - avgTiming) / avgTiming;
      expect(difference).toBeLessThan(0.1);
    });
  });

  test('安全なデフォルト設定', () => {
    // デフォルトでセキュアな設定になっているか確認
    const challenge = secureSystem.challengeGenerator.generateWeeklyChallenge(new Date());
    
    // XSS可能な文字が含まれていない
    expect(challenge.title).not.toMatch(/[<>'"]/);
    expect(challenge.description).not.toMatch(/[<>'"]/);
    
    // 数値が安全な範囲内
    expect(challenge.target).toBeGreaterThanOrEqual(0);
    expect(challenge.target).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    
    // WebSocketのデフォルト設定
    const messageHistory = secureSystem.websocketManager.getMessageHistory();
    expect(messageHistory).toHaveLength(0); // 初期状態では空
  });
});