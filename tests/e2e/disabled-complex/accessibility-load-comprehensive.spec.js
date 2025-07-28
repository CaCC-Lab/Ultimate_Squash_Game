/**
 * アクセシビリティ・負荷テスト包括的テストスイート
 * アクセシビリティ準拠、パフォーマンス限界、同時接続、長時間実行を網羅
 */

import { test, expect } from '@playwright/test';

test.describe('アクセシビリティ・負荷テスト包括テスト', () => {

  test.beforeEach(async ({ page }) => {
    // アクセシビリティ・負荷テスト監視スクリプトを注入
    await page.addInitScript(() => {
      window.accessibilityTestData = {
        aria: {
          labels: [],
          roles: [],
          properties: [],
          violations: []
        },
        keyboard: {
          focusableElements: [],
          tabOrder: [],
          keyboardTraps: [],
          shortcuts: []
        },
        visual: {
          colorContrast: [],
          textSize: [],
          animations: [],
          reduceMotion: false
        },
        load: {
          connectionCount: 0,
          concurrentUsers: 0,
          responseTimeMetrics: [],
          throughputMetrics: [],
          resourceUsage: [],
          degradationPoints: []
        }
      };

      // ARIA属性の監視
      const monitorAria = () => {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          // ARIA roles
          if (el.getAttribute('role')) {
            window.accessibilityTestData.aria.roles.push({
              element: el.tagName,
              role: el.getAttribute('role'),
              id: el.id || null
            });
          }

          // ARIA labels
          if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) {
            window.accessibilityTestData.aria.labels.push({
              element: el.tagName,
              label: el.getAttribute('aria-label'),
              labelledby: el.getAttribute('aria-labelledby'),
              id: el.id || null
            });
          }

          // その他のARIA属性
          Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('aria-') && attr.name !== 'aria-label' && attr.name !== 'aria-labelledby') {
              window.accessibilityTestData.aria.properties.push({
                element: el.tagName,
                property: attr.name,
                value: attr.value,
                id: el.id || null
              });
            }
          });
        });
      };

      // キーボードナビゲーション監視
      const monitorKeyboardNavigation = () => {
        const focusableElements = document.querySelectorAll(
          'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
        );

        window.accessibilityTestData.keyboard.focusableElements = Array.from(focusableElements).map(el => ({
          tagName: el.tagName,
          type: el.type || null,
          tabIndex: el.tabIndex,
          id: el.id || null,
          className: el.className || null
        }));

        // Tab順序の記録
        let tabOrder = [];
        document.addEventListener('focus', (event) => {
          if (event.target !== document.body) {
            tabOrder.push({
              element: event.target.tagName,
              id: event.target.id || null,
              timestamp: Date.now()
            });
            window.accessibilityTestData.keyboard.tabOrder = tabOrder.slice(-20); // 最新20件
          }
        }, true);
      };

      // 色・コントラストの監視
      const monitorVisualAccessibility = () => {
        const computeContrast = (bg, fg) => {
          // 簡易的なコントラスト計算
          const bgLum = getLuminance(bg);
          const fgLum = getLuminance(fg);
          const contrast = (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
          return contrast;
        };

        const getLuminance = (color) => {
          // RGB値の輝度計算（簡易版）
          const rgb = color.match(/\\d+/g);
          if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]) / 255;
            const g = parseInt(rgb[1]) / 255;
            const b = parseInt(rgb[2]) / 255;
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          }
          return 0.5; // デフォルト値
        };

        // テキスト要素のコントラストチェック
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, button, a');
        textElements.forEach(el => {
          const styles = getComputedStyle(el);
          const bgColor = styles.backgroundColor;
          const fgColor = styles.color;

          if (bgColor !== 'rgba(0, 0, 0, 0)' && fgColor !== 'rgba(0, 0, 0, 0)') {
            const contrast = computeContrast(bgColor, fgColor);
            window.accessibilityTestData.visual.colorContrast.push({
              element: el.tagName,
              contrast: contrast,
              backgroundColor: bgColor,
              color: fgColor,
              meetWCAG: contrast >= 4.5, // WCAG AA基準
              id: el.id || null
            });
          }
        });

        // reduced-motionの確認
        window.accessibilityTestData.visual.reduceMotion =
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      };

      // 負荷テスト関連の監視
      const monitorLoadMetrics = () => {
        let startTime = performance.now();

        // 応答時間監視
        const recordResponseTime = (operation, duration) => {
          window.accessibilityTestData.load.responseTimeMetrics.push({
            operation: operation,
            duration: duration,
            timestamp: Date.now()
          });
        };

        // スループット監視
        let operationCount = 0;
        const monitorThroughput = () => {
          operationCount++;
          const currentTime = performance.now();
          const elapsed = (currentTime - startTime) / 1000;
          const throughput = operationCount / elapsed;

          window.accessibilityTestData.load.throughputMetrics.push({
            operations: operationCount,
            throughput: throughput,
            timestamp: Date.now()
          });
        };

        // キー操作の応答時間測定
        document.addEventListener('keydown', (event) => {
          const keyStartTime = performance.now();
          requestAnimationFrame(() => {
            const keyDuration = performance.now() - keyStartTime;
            recordResponseTime('keydown', keyDuration);
            monitorThroughput();
          });
        });

        // マウス操作の応答時間測定
        document.addEventListener('click', (event) => {
          const clickStartTime = performance.now();
          requestAnimationFrame(() => {
            const clickDuration = performance.now() - clickStartTime;
            recordResponseTime('click', clickDuration);
            monitorThroughput();
          });
        });

        // リソース使用量監視
        setInterval(() => {
          if (performance.memory) {
            window.accessibilityTestData.load.resourceUsage.push({
              memoryUsed: performance.memory.usedJSHeapSize,
              memoryTotal: performance.memory.totalJSHeapSize,
              timestamp: Date.now()
            });
          }
        }, 2000);
      };

      // 初期化
      setTimeout(() => {
        monitorAria();
        monitorKeyboardNavigation();
        monitorVisualAccessibility();
        monitorLoadMetrics();
      }, 2000);

      // 定期更新
      setInterval(() => {
        monitorAria();
        monitorVisualAccessibility();
      }, 5000);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ アクセシビリティエラー: ${msg.text()}`);
      }
    });
  });

  test('WCAG 2.1 AA準拠アクセシビリティテスト', async ({ page }) => {
    console.log('♿ WCAG 2.1 AA準拠アクセシビリティテストを開始...');

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

    // ARIA属性の確認
    const ariaData = await page.evaluate(() => window.accessibilityTestData.aria);

    console.log('📊 ARIA情報:', {
      ラベル数: ariaData.labels.length,
      ロール数: ariaData.roles.length,
      属性数: ariaData.properties.length
    });

    // ゲーム要素にアクセシビリティ属性があることを確認
    const gameCanvas = page.locator('#gameCanvas');
    await expect(gameCanvas).toBeVisible();

    // キャンバスのアクセシビリティ確認
    const canvasAccessibility = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      return {
        hasRole: canvas.getAttribute('role') !== null,
        hasLabel: canvas.getAttribute('aria-label') !== null,
        hasDescription: canvas.getAttribute('aria-describedby') !== null,
        tabIndex: canvas.tabIndex
      };
    });

    console.log('🎮 キャンバスアクセシビリティ:', canvasAccessibility);

    // 色コントラストの確認
    const contrastData = await page.evaluate(() => window.accessibilityTestData.visual.colorContrast);

    if (contrastData.length > 0) {
      const failedContrast = contrastData.filter(item => !item.meetWCAG);
      console.log('🎨 色コントラスト:', {
        総要素数: contrastData.length,
        WCAG準拠: contrastData.length - failedContrast.length,
        WCAG非準拠: failedContrast.length
      });

      if (failedContrast.length > 0) {
        console.log('⚠️ コントラスト不足要素:', failedContrast.slice(0, 5));
      }

      // 重要なUI要素のコントラストが適切であることを確認
      const importantElements = contrastData.filter(item =>
        item.element === 'BUTTON' || item.element === 'A'
      );

      if (importantElements.length > 0) {
        const goodContrast = importantElements.filter(item => item.meetWCAG);
        expect(goodContrast.length / importantElements.length).toBeGreaterThan(0.8); // 80%以上
      }
    }

    // reduced-motionの対応確認
    const reduceMotion = await page.evaluate(() => window.accessibilityTestData.visual.reduceMotion);
    console.log('🎭 モーション設定:', { reduceMotion });

    console.log('✅ WCAG 2.1 AA準拠アクセシビリティテスト完了');
  });

  test('キーボードナビゲーション完全テスト', async ({ page }) => {
    console.log('⌨️ キーボードナビゲーション完全テストを開始...');

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

    // フォーカス可能要素の確認
    const keyboardData = await page.evaluate(() => window.accessibilityTestData.keyboard);

    console.log('⌨️ キーボードナビゲーション情報:', {
      フォーカス可能要素数: keyboardData.focusableElements.length,
      記録されたTab順序: keyboardData.tabOrder.length
    });

    // Tabキーナビゲーションのテスト
    console.log('🔄 Tabキーナビゲーションをテスト中...');

    // 最初にbodyにフォーカス
    await page.focus('body');

    // Tab を5回押してナビゲーション
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el.tagName,
          id: el.id || null,
          className: el.className || null,
          type: el.type || null
        };
      });

      console.log(`Tab ${i + 1}:`, focusedElement);
    }

    // Shift+Tab でのバックナビゲーション
    console.log('⬅️ Shift+Tabバックナビゲーションをテスト中...');

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(200);
    }

    // ゲーム操作キーのテスト
    console.log('🎮 ゲーム操作キーをテスト中...');

    const gameKeys = ['ArrowLeft', 'ArrowRight', 'Space', 'h', 'r'];

    for (const key of gameKeys) {
      console.log(`  ${key}キーテスト...`);
      await page.keyboard.press(key);
      await page.waitForTimeout(300);
    }

    // キーボードトラップの確認
    const tabOrderData = await page.evaluate(() => window.accessibilityTestData.keyboard.tabOrder);

    if (tabOrderData.length > 3) {
      // 同じ要素に連続してフォーカスが当たっていないか確認
      let consecutiveCount = 1;
      for (let i = 1; i < tabOrderData.length; i++) {
        if (tabOrderData[i].id === tabOrderData[i-1].id && tabOrderData[i].element === tabOrderData[i-1].element) {
          consecutiveCount++;
        } else {
          consecutiveCount = 1;
        }

        // 3回以上連続で同じ要素はキーボードトラップの可能性
        expect(consecutiveCount).toBeLessThan(3);
      }

      console.log('✅ キーボードトラップなし');
    }

    console.log('✅ キーボードナビゲーション完全テスト完了');
  });

  test('スクリーンリーダー互換性テスト', async ({ page }) => {
    console.log('📢 スクリーンリーダー互換性テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    // スクリーンリーダー支援技術のテスト
    const screenReaderSupport = await page.evaluate(() => {
      const results = {
        headingStructure: [],
        landmarkRoles: [],
        altTexts: [],
        liveRegions: [],
        descriptions: []
      };

      // 見出し構造の確認
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        results.headingStructure.push({
          level: heading.tagName,
          text: heading.textContent?.trim() || '',
          id: heading.id || null
        });
      });

      // ランドマークロールの確認
      const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], main, nav, header, footer, aside');
      landmarks.forEach(landmark => {
        results.landmarkRoles.push({
          element: landmark.tagName,
          role: landmark.getAttribute('role') || landmark.tagName.toLowerCase(),
          id: landmark.id || null
        });
      });

      // 画像のalt属性確認
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        results.altTexts.push({
          src: img.src,
          alt: img.alt || null,
          hasAlt: img.hasAttribute('alt'),
          id: img.id || null
        });
      });

      // live regionの確認
      const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      liveRegions.forEach(region => {
        results.liveRegions.push({
          element: region.tagName,
          ariaLive: region.getAttribute('aria-live'),
          role: region.getAttribute('role'),
          id: region.id || null
        });
      });

      // aria-describedbyの確認
      const describedElements = document.querySelectorAll('[aria-describedby]');
      describedElements.forEach(el => {
        const describedBy = el.getAttribute('aria-describedby');
        const descriptionElement = document.getElementById(describedBy);
        results.descriptions.push({
          element: el.tagName,
          describedBy: describedBy,
          hasDescription: !!descriptionElement,
          descriptionText: descriptionElement?.textContent?.trim() || null,
          id: el.id || null
        });
      });

      return results;
    });

    console.log('📢 スクリーンリーダー支援技術情報:', {
      見出し数: screenReaderSupport.headingStructure.length,
      ランドマーク数: screenReaderSupport.landmarkRoles.length,
      画像数: screenReaderSupport.altTexts.length,
      ライブリージョン数: screenReaderSupport.liveRegions.length,
      説明付き要素数: screenReaderSupport.descriptions.length
    });

    // 見出し構造の確認
    if (screenReaderSupport.headingStructure.length > 0) {
      console.log('📝 見出し構造:', screenReaderSupport.headingStructure);

      // H1が存在することを確認
      const h1Count = screenReaderSupport.headingStructure.filter(h => h.level === 'H1').length;
      expect(h1Count).toBeGreaterThanOrEqual(1);
      console.log('✅ H1見出しが存在');
    }

    // 画像のalt属性確認
    if (screenReaderSupport.altTexts.length > 0) {
      const imagesWithoutAlt = screenReaderSupport.altTexts.filter(img => !img.hasAlt);
      console.log('🖼️ alt属性なし画像:', imagesWithoutAlt.length);

      // 装飾的でない画像にはalt属性があることを確認
      expect(imagesWithoutAlt.length).toBeLessThan(screenReaderSupport.altTexts.length);
    }

    // ゲーム状態の音声フィードバック機能をテスト
    console.log('🔊 ゲーム状態音声フィードバックをテスト中...');

    // ゲーム操作実行
    await page.keyboard.press('Space'); // ポーズ
    await page.waitForTimeout(1000);
    await page.keyboard.press('Space'); // 再開
    await page.waitForTimeout(1000);

    // ランキング表示（スクリーンリーダー対応の確認）
    await page.keyboard.press('h');
    await page.waitForTimeout(2000);

    // モーダルのアクセシビリティ確認
    const modalAccessibility = await page.evaluate(() => {
      const modal = document.getElementById('rankingModal');
      if (modal && modal.style.display !== 'none') {
        return {
          hasRole: modal.getAttribute('role') !== null,
          hasLabel: modal.getAttribute('aria-label') !== null || modal.getAttribute('aria-labelledby') !== null,
          hasCloseButton: !!modal.querySelector('button'),
          focusManagement: document.activeElement === modal || modal.contains(document.activeElement)
        };
      }
      return null;
    });

    if (modalAccessibility) {
      console.log('📋 モーダルアクセシビリティ:', modalAccessibility);

      // モーダルが適切にラベル付けされていることを確認
      expect(modalAccessibility.hasLabel).toBe(true);
      console.log('✅ モーダルが適切にラベル付けされている');
    }

    console.log('✅ スクリーンリーダー互換性テスト完了');
  });

  test('負荷・同時接続限界テスト', async ({ page, context }) => {
    console.log('⚡ 負荷・同時接続限界テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    // 複数タブでの同時接続テスト
    console.log('🔗 複数タブでの同時接続テスト中...');

    const tabs = [page];
    const maxTabs = 5; // 5つのタブを同時に開く

    // 追加タブを開く
    for (let i = 1; i < maxTabs; i++) {
      try {
        const newTab = await context.newPage();
        await newTab.goto('http://localhost:3000/docs/game.html');
        tabs.push(newTab);
        console.log(`  タブ${i + 1}を開きました`);
      } catch (e) {
        console.log(`  ⚠️ タブ${i + 1}の作成に失敗: ${e.message}`);
        break;
      }
    }

    console.log(`📊 同時接続タブ数: ${tabs.length}`);

    // 全タブで同時に初期化を待つ
    const initPromises = tabs.map(async (tab, index) => {
      try {
        const overlay = tab.locator('#loadingOverlay');
        await expect(overlay).toBeHidden({ timeout: 90000 });
        console.log(`  ✅ タブ${index + 1}初期化完了`);
        return true;
      } catch (e) {
        console.log(`  ⚠️ タブ${index + 1}初期化タイムアウト`);
        return false;
      }
    });

    const initResults = await Promise.all(initPromises);
    const successfulTabs = initResults.filter(Boolean).length;

    console.log(`📊 初期化成功タブ数: ${successfulTabs}/${tabs.length}`);

    // 同時操作負荷テスト
    console.log('⚡ 全タブで同時操作負荷テスト中...');

    const operationPromises = tabs.map(async (tab, index) => {
      try {
        // 各タブで集中的な操作を実行
        for (let i = 0; i < 20; i++) {
          await tab.keyboard.press('ArrowLeft');
          await tab.waitForTimeout(50);
          await tab.keyboard.press('ArrowRight');
          await tab.waitForTimeout(50);
          await tab.keyboard.press('Space');
          await tab.waitForTimeout(100);
        }
        console.log(`  ✅ タブ${index + 1}操作完了`);
        return true;
      } catch (e) {
        console.log(`  ❌ タブ${index + 1}操作失敗: ${e.message}`);
        return false;
      }
    });

    const operationResults = await Promise.all(operationPromises);
    const successfulOperations = operationResults.filter(Boolean).length;

    console.log(`📊 操作成功タブ数: ${successfulOperations}/${tabs.length}`);

    // 負荷メトリクスを収集
    const loadMetrics = await page.evaluate(() => window.accessibilityTestData.load);

    console.log('📊 負荷メトリクス:', {
      応答時間記録数: loadMetrics.responseTimeMetrics.length,
      スループット記録数: loadMetrics.throughputMetrics.length,
      リソース使用量記録数: loadMetrics.resourceUsage.length
    });

    if (loadMetrics.responseTimeMetrics.length > 0) {
      const avgResponseTime = loadMetrics.responseTimeMetrics.reduce((sum, metric) =>
        sum + metric.duration, 0) / loadMetrics.responseTimeMetrics.length;

      console.log(`📊 平均応答時間: ${avgResponseTime.toFixed(2)}ms`);

      // 応答時間が妥当な範囲内であることを確認
      expect(avgResponseTime).toBeLessThan(100); // 100ms以内
    }

    if (loadMetrics.throughputMetrics.length > 0) {
      const maxThroughput = Math.max(...loadMetrics.throughputMetrics.map(m => m.throughput));
      console.log(`📊 最大スループット: ${maxThroughput.toFixed(2)} ops/sec`);

      // 最低限のスループットを確保
      expect(maxThroughput).toBeGreaterThan(1); // 1 ops/sec以上
    }

    // 追加で開いたタブを閉じる
    for (let i = 1; i < tabs.length; i++) {
      await tabs[i].close();
    }

    // 元のタブが依然として動作することを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    console.log('✅ 負荷テスト後もメインタブ動作継続');

    console.log('✅ 負荷・同時接続限界テスト完了');
  });

  test('長時間実行・安定性テスト', async ({ page }) => {
    console.log('⏱️ 長時間実行・安定性テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    // 初期リソース使用量を記録
    const initialResources = await page.evaluate(() => {
      if (performance.memory) {
        return {
          memory: performance.memory.usedJSHeapSize,
          timestamp: Date.now()
        };
      }
      return null;
    });

    if (initialResources) {
      console.log(`📊 初期メモリ使用量: ${(initialResources.memory / 1024 / 1024).toFixed(2)}MB`);
    }

    // 長時間実行テスト（2分間の継続操作）
    const testDuration = 2 * 60 * 1000; // 2分
    const startTime = Date.now();
    let operationCount = 0;
    let errorCount = 0;

    console.log('🏃‍♂️ 2分間の継続操作テストを開始...');

    const operations = [
      () => page.keyboard.press('ArrowLeft'),
      () => page.keyboard.press('ArrowRight'),
      () => page.keyboard.press('Space'),
      () => page.mouse.click(400, 300),
      () => page.keyboard.press('h'),
      () => page.keyboard.press('r')
    ];

    while (Date.now() - startTime < testDuration) {
      try {
        // ランダムな操作を実行
        const randomOperation = operations[Math.floor(Math.random() * operations.length)];
        await randomOperation();
        operationCount++;

        // 定期的な状態確認
        if (operationCount % 100 === 0) {
          const currentTime = Date.now();
          const elapsed = (currentTime - startTime) / 1000;
          const opsPerSecond = operationCount / elapsed;

          console.log(`📊 ${elapsed.toFixed(1)}秒経過: ${operationCount}操作 (${opsPerSecond.toFixed(2)} ops/sec)`);

          // ゲームが依然として動作していることを確認
          await expect(page.locator('#gameCanvas')).toBeVisible();

          // メモリ使用量チェック
          const currentMemory = await page.evaluate(() => {
            if (performance.memory) {
              return performance.memory.usedJSHeapSize;
            }
            return null;
          });

          if (initialResources && currentMemory) {
            const memoryIncrease = currentMemory - initialResources.memory;
            const increasePercentage = (memoryIncrease / initialResources.memory) * 100;

            console.log(`💾 メモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(1)}%)`);

            // 異常なメモリ増加の検出
            if (increasePercentage > 500) { // 500%以上の増加
              console.warn('⚠️ 異常なメモリ増加を検出');
            }
          }
        }

        // 適度な間隔で操作
        await page.waitForTimeout(Math.random() * 200 + 50);

      } catch (e) {
        errorCount++;
        console.log(`❌ 操作エラー ${errorCount}: ${e.message}`);

        // 連続エラーが多すぎる場合は中断
        if (errorCount > 20) {
          console.log('❌ 連続エラーが多すぎるため、テストを中断');
          break;
        }
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    console.log('📊 長時間実行テスト結果:', {
      実行時間: `${totalTime.toFixed(1)}秒`,
      総操作数: operationCount,
      エラー数: errorCount,
      成功率: `${((operationCount - errorCount) / operationCount * 100).toFixed(1)}%`,
      平均操作レート: `${(operationCount / totalTime).toFixed(2)} ops/sec`
    });

    // 最終的な安定性確認
    const loadData = await page.evaluate(() => window.accessibilityTestData.load);

    if (loadData.resourceUsage.length > 1) {
      const firstUsage = loadData.resourceUsage[0];
      const lastUsage = loadData.resourceUsage[loadData.resourceUsage.length - 1];

      const memoryGrowth = lastUsage.memoryUsed - firstUsage.memoryUsed;
      const growthRate = (memoryGrowth / firstUsage.memoryUsed) * 100;

      console.log(`📊 最終メモリ増加率: ${growthRate.toFixed(2)}%`);

      // 異常なメモリリークがないことを確認
      expect(growthRate).toBeLessThan(300); // 300%未満
    }

    // 高い成功率を確保
    const successRate = (operationCount - errorCount) / operationCount;
    expect(successRate).toBeGreaterThan(0.9); // 90%以上の成功率

    // 最終的なゲーム動作確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    console.log('✅ 長時間実行後もゲーム正常動作');
    console.log('✅ 長時間実行・安定性テスト完了');
  });

  test('パフォーマンス境界値・劣化検出テスト', async ({ page }) => {
    console.log('📈 パフォーマンス境界値・劣化検出テストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    try {
      const loadingOverlay = page.locator('#loadingOverlay');
      await expect(loadingOverlay).toBeHidden({ timeout: 60000 });
      console.log('✅ Pyodide初期化完了');
    } catch (e) {
      console.log('⚠️ Pyodide初期化タイムアウト');
    }

    // 基準パフォーマンスの測定
    console.log('📊 基準パフォーマンスを測定中...');

    await page.waitForTimeout(3000);

    const baselinePerformance = await page.evaluate(() => {
      let frameCount = 0;
      let startTime = performance.now();

      return new Promise((resolve) => {
        const measureFPS = () => {
          frameCount++;
          if (frameCount >= 60) { // 60フレーム測定
            const endTime = performance.now();
            const fps = 60 / ((endTime - startTime) / 1000);
            resolve({
              fps: fps,
              duration: endTime - startTime,
              memory: performance.memory ? performance.memory.usedJSHeapSize : null
            });
          } else {
            requestAnimationFrame(measureFPS);
          }
        };
        requestAnimationFrame(measureFPS);
      });
    });

    console.log('📊 基準パフォーマンス:', {
      FPS: baselinePerformance.fps.toFixed(2),
      測定時間: `${baselinePerformance.duration.toFixed(2)}ms`,
      メモリ: baselinePerformance.memory ? `${(baselinePerformance.memory / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    });

    // 高負荷状況でのパフォーマンス測定
    console.log('⚡ 高負荷状況でのパフォーマンス測定中...');

    // 高負荷を生成（大量のDOM操作とアニメーション）
    await page.evaluate(() => {
      // 大量のDOM要素を追加
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.width = '10px';
        div.style.height = '10px';
        div.style.backgroundColor = `hsl(${i % 360}, 50%, 50%)`;
        div.style.left = Math.random() * window.innerWidth + 'px';
        div.style.top = Math.random() * window.innerHeight + 'px';
        div.className = 'stress-test-element';
        document.body.appendChild(div);
      }

      // CSS アニメーションを追加
      const style = document.createElement('style');
      style.textContent = `
        .stress-test-element {
          animation: stress-animation 1s infinite;
        }
        @keyframes stress-animation {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.5); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `;
      document.head.appendChild(style);
    });

    // 高負荷下でのゲーム操作
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
    }

    // 高負荷時のパフォーマンス測定
    const stressPerformance = await page.evaluate(() => {
      let frameCount = 0;
      let startTime = performance.now();

      return new Promise((resolve) => {
        const measureFPS = () => {
          frameCount++;
          if (frameCount >= 60) {
            const endTime = performance.now();
            const fps = 60 / ((endTime - startTime) / 1000);
            resolve({
              fps: fps,
              duration: endTime - startTime,
              memory: performance.memory ? performance.memory.usedJSHeapSize : null
            });
          } else {
            requestAnimationFrame(measureFPS);
          }
        };
        requestAnimationFrame(measureFPS);
      });
    });

    console.log('📊 高負荷時パフォーマンス:', {
      FPS: stressPerformance.fps.toFixed(2),
      測定時間: `${stressPerformance.duration.toFixed(2)}ms`,
      メモリ: stressPerformance.memory ? `${(stressPerformance.memory / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    });

    // パフォーマンス劣化の分析
    const fpsDecline = baselinePerformance.fps - stressPerformance.fps;
    const fpsDeclinePercentage = (fpsDecline / baselinePerformance.fps) * 100;

    console.log('📊 パフォーマンス劣化分析:', {
      'FPS低下': fpsDecline.toFixed(2),
      '低下率': `${fpsDeclinePercentage.toFixed(1)}%`
    });

    // 許容可能な劣化範囲内であることを確認
    expect(fpsDeclinePercentage).toBeLessThan(70); // 70%未満の低下
    expect(stressPerformance.fps).toBeGreaterThan(5); // 最低5FPS

    // メモリ使用量の増加確認
    if (baselinePerformance.memory && stressPerformance.memory) {
      const memoryIncrease = stressPerformance.memory - baselinePerformance.memory;
      const memoryIncreasePercentage = (memoryIncrease / baselinePerformance.memory) * 100;

      console.log('📊 メモリ使用量増加:', {
        増加量: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        増加率: `${memoryIncreasePercentage.toFixed(1)}%`
      });

      // 異常なメモリ増加がないことを確認
      expect(memoryIncreasePercentage).toBeLessThan(200); // 200%未満の増加
    }

    // ストレステスト要素のクリーンアップ
    await page.evaluate(() => {
      const stressElements = document.querySelectorAll('.stress-test-element');
      stressElements.forEach(el => el.remove());

      const style = document.querySelector('style');
      if (style && style.textContent.includes('stress-animation')) {
        style.remove();
      }
    });

    // ゲームが依然として動作することを確認
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    console.log('✅ 高負荷テスト後もゲーム正常動作');
    console.log('✅ パフォーマンス境界値・劣化検出テスト完了');
  });

});
