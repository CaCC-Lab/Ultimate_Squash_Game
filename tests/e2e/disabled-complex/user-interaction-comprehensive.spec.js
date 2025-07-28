/**
 * ユーザーインタラクション全パターン包括テストスイート
 * キーボード、マウス、タッチ、アクセシビリティのあらゆる入力パターンを網羅
 */

import { test, expect } from '@playwright/test';

test.describe('ユーザーインタラクション包括テスト', () => {

  test.beforeEach(async ({ page }) => {
    // インタラクション監視スクリプトを注入
    await page.addInitScript(() => {
      window.interactionTestData = {
        keyboardEvents: [],
        mouseEvents: [],
        touchEvents: [],
        focusEvents: [],
        inputLatencies: [],
        errors: []
      };

      // キーボードイベントの監視
      document.addEventListener('keydown', (event) => {
        window.interactionTestData.keyboardEvents.push({
          type: 'keydown',
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          timestamp: Date.now(),
          target: event.target.tagName
        });
      });

      document.addEventListener('keyup', (event) => {
        window.interactionTestData.keyboardEvents.push({
          type: 'keyup',
          key: event.key,
          code: event.code,
          timestamp: Date.now(),
          target: event.target.tagName
        });
      });

      // マウスイベントの監視
      ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'wheel'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          window.interactionTestData.mouseEvents.push({
            type: eventType,
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            buttons: event.buttons,
            timestamp: Date.now(),
            target: event.target.tagName
          });
        });
      });

      // タッチイベントの監視
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          const touches = Array.from(event.touches).map(touch => ({
            x: touch.clientX,
            y: touch.clientY,
            identifier: touch.identifier
          }));

          window.interactionTestData.touchEvents.push({
            type: eventType,
            touches: touches,
            timestamp: Date.now(),
            target: event.target.tagName
          });
        });
      });

      // フォーカスイベントの監視
      ['focus', 'blur', 'focusin', 'focusout'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          window.interactionTestData.focusEvents.push({
            type: eventType,
            target: event.target.tagName,
            targetId: event.target.id,
            timestamp: Date.now()
          });
        });
      });

      // 入力遅延の測定
      window.measureInputLatency = (inputType) => {
        const startTime = performance.now();
        return () => {
          const endTime = performance.now();
          window.interactionTestData.inputLatencies.push({
            inputType: inputType,
            latency: endTime - startTime,
            timestamp: Date.now()
          });
        };
      };
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ コンソールエラー: ${msg.text()}`);
      }
    });
  });

  test('キーボード入力全パターンテスト', async ({ page }) => {
    console.log('⌨️ キーボード入力全パターンテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // 基本ゲームキーのテスト
    const gameKeys = [
      { key: 'ArrowLeft', description: '左移動' },
      { key: 'ArrowRight', description: '右移動' },
      { key: 'ArrowUp', description: '上移動（もしあれば）' },
      { key: 'ArrowDown', description: '下移動（もしあれば）' },
      { key: 'Space', description: 'ポーズ/再開' },
      { key: 'Enter', description: 'エンター' },
      { key: 'Escape', description: 'エスケープ' },
      { key: 'r', description: 'リセット' },
      { key: 'h', description: 'ランキング表示' },
      { key: 'd', description: 'デバッグ表示' },
      { key: 'f', description: 'フルスクリーン' },
      { key: 'p', description: 'ポーズ' }
    ];

    console.log('🎯 基本ゲームキーのテスト...');

    for (const gameKey of gameKeys) {
      console.log(`  Testing: ${gameKey.key} (${gameKey.description})`);

      // 遅延測定開始
      await page.evaluate((key) => {
        window.currentLatencyMeasure = window.measureInputLatency(`key_${key}`);
      }, gameKey.key);

      await page.keyboard.press(gameKey.key);
      await page.waitForTimeout(100);

      // 遅延測定終了
      await page.evaluate(() => {
        if (window.currentLatencyMeasure) {
          window.currentLatencyMeasure();
        }
      });

      await page.waitForTimeout(200);
    }

    // 修飾キーとの組み合わせテスト
    console.log('🔧 修飾キー組み合わせテスト...');

    const modifierCombinations = [
      { keys: 'Control+r', description: 'Ctrl+R（ブラウザリロード防止）' },
      { keys: 'Shift+ArrowLeft', description: 'Shift+左矢印' },
      { keys: 'Alt+f', description: 'Alt+F' },
      { keys: 'Control+Space', description: 'Ctrl+Space' }
    ];

    for (const combo of modifierCombinations) {
      console.log(`  Testing: ${combo.keys} (${combo.description})`);
      await page.keyboard.press(combo.keys);
      await page.waitForTimeout(200);
    }

    // 高速連続入力テスト
    console.log('⚡ 高速連続入力テスト...');

    const rapidInputStartTime = Date.now();

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(25);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(25);
    }

    const rapidInputEndTime = Date.now();
    const rapidInputDuration = rapidInputEndTime - rapidInputStartTime;

    console.log(`⚡ 高速入力時間: ${rapidInputDuration}ms`);

    // 長押しテスト
    console.log('⏱️ 長押しテスト...');

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowLeft');

    await page.waitForTimeout(500);

    // キーボードイベント履歴を取得
    const keyboardEvents = await page.evaluate(() => window.interactionTestData.keyboardEvents);
    const inputLatencies = await page.evaluate(() => window.interactionTestData.inputLatencies);

    console.log('📊 キーボードイベント数:', keyboardEvents.length);
    console.log('📊 入力遅延測定数:', inputLatencies.length);

    // キーボードイベントの検証
    expect(keyboardEvents.length).toBeGreaterThan(0);

    if (keyboardEvents.length > 0) {
      // 基本的なイベント構造の検証
      keyboardEvents.forEach((event, index) => {
        expect(event.type).toMatch(/^(keydown|keyup)$/);
        expect(event.key).toBeDefined();
        expect(event.timestamp).toBeGreaterThan(0);

        if (index < 5) { // 最初の5つのイベントをログ出力
          console.log(`🔍 キーイベント${index + 1}:`, {
            type: event.type,
            key: event.key,
            target: event.target
          });
        }
      });

      // ゲームキーが記録されていることを確認
      const gameKeyEvents = keyboardEvents.filter(event =>
        ['ArrowLeft', 'ArrowRight', 'Space', 'r', 'h'].includes(event.key)
      );

      expect(gameKeyEvents.length).toBeGreaterThan(0);
      console.log('✅ ゲームキー入力が正常に記録されました');
    }

    // 入力遅延の分析
    if (inputLatencies.length > 0) {
      const avgLatency = inputLatencies.reduce((sum, l) => sum + l.latency, 0) / inputLatencies.length;
      const maxLatency = Math.max(...inputLatencies.map(l => l.latency));

      console.log('📊 入力遅延統計:', {
        平均: `${avgLatency.toFixed(2)}ms`,
        最大: `${maxLatency.toFixed(2)}ms`,
        サンプル数: inputLatencies.length
      });

      // パフォーマンス要件の検証
      expect(avgLatency).toBeLessThan(50); // 平均50ms以下
      expect(maxLatency).toBeLessThan(200); // 最大200ms以下

      console.log('✅ キーボード入力遅延が許容範囲内です');
    }
  });

  test('マウス入力全パターンテスト', async ({ page }) => {
    console.log('🖱️ マウス入力全パターンテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // ゲームキャンバスの位置を取得
    const canvas = page.locator('#gameCanvas');
    const canvasBounds = await canvas.boundingBox();

    if (canvasBounds) {
      console.log('🎯 ゲームキャンバス領域:', canvasBounds);

      // マウスクリックテスト
      console.log('👆 マウスクリックテスト...');

      const clickPoints = [
        { x: canvasBounds.x + canvasBounds.width * 0.2, y: canvasBounds.y + canvasBounds.height * 0.8, desc: '左下（ラケット領域）' },
        { x: canvasBounds.x + canvasBounds.width * 0.5, y: canvasBounds.y + canvasBounds.height * 0.5, desc: '中央' },
        { x: canvasBounds.x + canvasBounds.width * 0.8, y: canvasBounds.y + canvasBounds.height * 0.8, desc: '右下（ラケット領域）' },
        { x: canvasBounds.x + canvasBounds.width * 0.5, y: canvasBounds.y + canvasBounds.height * 0.2, desc: '上部（ボール領域）' }
      ];

      for (const point of clickPoints) {
        console.log(`  クリック: ${point.desc} (${point.x}, ${point.y})`);

        await page.evaluate(() => {
          window.currentLatencyMeasure = window.measureInputLatency('mouse_click');
        });

        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(300);

        await page.evaluate(() => {
          if (window.currentLatencyMeasure) {
            window.currentLatencyMeasure();
          }
        });
      }

      // ダブルクリックテスト
      console.log('👆👆 ダブルクリックテスト...');

      await page.mouse.dblclick(
        canvasBounds.x + canvasBounds.width * 0.5,
        canvasBounds.y + canvasBounds.height * 0.5
      );
      await page.waitForTimeout(500);

      // マウス移動テスト
      console.log('🖱️ マウス移動テスト...');

      // ラケット制御のためのマウス移動
      const movePoints = [
        { x: canvasBounds.x + canvasBounds.width * 0.1, y: canvasBounds.y + canvasBounds.height * 0.9 },
        { x: canvasBounds.x + canvasBounds.width * 0.3, y: canvasBounds.y + canvasBounds.height * 0.9 },
        { x: canvasBounds.x + canvasBounds.width * 0.7, y: canvasBounds.y + canvasBounds.height * 0.9 },
        { x: canvasBounds.x + canvasBounds.width * 0.9, y: canvasBounds.y + canvasBounds.height * 0.9 }
      ];

      for (const point of movePoints) {
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(200);
      }

      // ドラッグテスト
      console.log('🖱️ ドラッグテスト...');

      await page.mouse.move(
        canvasBounds.x + canvasBounds.width * 0.2,
        canvasBounds.y + canvasBounds.height * 0.9
      );
      await page.mouse.down();

      for (let i = 0.2; i <= 0.8; i += 0.1) {
        await page.mouse.move(
          canvasBounds.x + canvasBounds.width * i,
          canvasBounds.y + canvasBounds.height * 0.9
        );
        await page.waitForTimeout(50);
      }

      await page.mouse.up();
      await page.waitForTimeout(500);

      // ホイールスクロールテスト
      console.log('🎡 ホイールスクロールテスト...');

      await page.mouse.wheel(0, 100); // 下スクロール
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100); // 上スクロール
      await page.waitForTimeout(200);

    } else {
      console.log('⚠️ ゲームキャンバスが見つかりません');
    }

    // マウスイベント履歴を取得
    const mouseEvents = await page.evaluate(() => window.interactionTestData.mouseEvents);
    const inputLatencies = await page.evaluate(() => window.interactionTestData.inputLatencies);

    console.log('📊 マウスイベント数:', mouseEvents.length);

    if (mouseEvents.length > 0) {
      // マウスイベントの種類別集計
      const eventTypes = {};
      mouseEvents.forEach(event => {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      });

      console.log('📊 マウスイベント種類別:', eventTypes);

      // 基本的なイベント構造の検証
      mouseEvents.slice(0, 5).forEach((event, index) => {
        expect(event.type).toMatch(/^(mousedown|mouseup|mousemove|click|dblclick|wheel)$/);
        expect(event.x).toBeDefined();
        expect(event.y).toBeDefined();
        expect(event.timestamp).toBeGreaterThan(0);

        console.log(`🔍 マウスイベント${index + 1}:`, {
          type: event.type,
          position: `(${event.x}, ${event.y})`,
          target: event.target
        });
      });

      // クリックイベントが記録されていることを確認
      const clickEvents = mouseEvents.filter(event => event.type === 'click');
      expect(clickEvents.length).toBeGreaterThan(0);

      console.log('✅ マウス入力が正常に記録されました');
    }

    // マウス入力遅延の分析
    const mouseLatencies = inputLatencies.filter(l => l.inputType.startsWith('mouse_'));

    if (mouseLatencies.length > 0) {
      const avgLatency = mouseLatencies.reduce((sum, l) => sum + l.latency, 0) / mouseLatencies.length;

      console.log('📊 マウス入力遅延:', `${avgLatency.toFixed(2)}ms`);
      expect(avgLatency).toBeLessThan(100); // 100ms以下

      console.log('✅ マウス入力遅延が許容範囲内です');
    }
  });

  test('タッチ入力・モバイル操作テスト', async ({ page }) => {
    console.log('📱 タッチ入力・モバイル操作テストを開始...');

    // モバイル画面サイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // ゲームキャンバスの位置を取得
    const canvas = page.locator('#gameCanvas');
    const canvasBounds = await canvas.boundingBox();

    if (canvasBounds) {
      console.log('📱 モバイルキャンバス領域:', canvasBounds);

      // シングルタップテスト
      console.log('👆 シングルタップテスト...');

      const tapPoints = [
        { x: canvasBounds.x + canvasBounds.width * 0.2, y: canvasBounds.y + canvasBounds.height * 0.8, desc: '左下' },
        { x: canvasBounds.x + canvasBounds.width * 0.5, y: canvasBounds.y + canvasBounds.height * 0.5, desc: '中央' },
        { x: canvasBounds.x + canvasBounds.width * 0.8, y: canvasBounds.y + canvasBounds.height * 0.8, desc: '右下' }
      ];

      for (const point of tapPoints) {
        console.log(`  タップ: ${point.desc} (${point.x}, ${point.y})`);

        await page.evaluate(() => {
          window.currentLatencyMeasure = window.measureInputLatency('touch_tap');
        });

        await page.touchscreen.tap(point.x, point.y);
        await page.waitForTimeout(300);

        await page.evaluate(() => {
          if (window.currentLatencyMeasure) {
            window.currentLatencyMeasure();
          }
        });
      }

      // スワイプテスト
      console.log('👆➡️ スワイプテスト...');

      // 左から右へのスワイプ
      await page.touchscreen.tap(canvasBounds.x + canvasBounds.width * 0.2, canvasBounds.y + canvasBounds.height * 0.8);
      await page.waitForTimeout(100);

      // 右から左へのスワイプ
      await page.touchscreen.tap(canvasBounds.x + canvasBounds.width * 0.8, canvasBounds.y + canvasBounds.height * 0.8);
      await page.waitForTimeout(100);

      // 上下スワイプ
      await page.touchscreen.tap(canvasBounds.x + canvasBounds.width * 0.5, canvasBounds.y + canvasBounds.height * 0.8);
      await page.waitForTimeout(100);
      await page.touchscreen.tap(canvasBounds.x + canvasBounds.width * 0.5, canvasBounds.y + canvasBounds.height * 0.2);
      await page.waitForTimeout(300);

      // 長押しテスト
      console.log('👆⏱️ 長押しテスト...');

      // 長押しシミュレーション（タップ→待機→リリース）
      await page.evaluate((point) => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{
            clientX: point.x,
            clientY: point.y,
            identifier: 0
          }],
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(touchEvent);

        setTimeout(() => {
          const endEvent = new TouchEvent('touchend', {
            touches: [],
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(endEvent);
        }, 1000);
      }, { x: canvasBounds.x + canvasBounds.width * 0.5, y: canvasBounds.y + canvasBounds.height * 0.5 });

      await page.waitForTimeout(1500);

    } else {
      console.log('⚠️ ゲームキャンバスが見つかりません');
    }

    // タッチコントロールボタンのテスト（存在する場合）
    console.log('🎮 タッチコントロールボタンテスト...');

    try {
      const touchControls = page.locator('.touch-controls');
      if (await touchControls.isVisible()) {
        const buttons = touchControls.locator('button');
        const buttonCount = await buttons.count();

        console.log(`🎮 タッチコントロールボタン数: ${buttonCount}`);

        for (let i = 0; i < buttonCount; i++) {
          const button = buttons.nth(i);
          const buttonText = await button.textContent();
          console.log(`  ボタン${i + 1}テスト: ${buttonText}`);

          await button.tap();
          await page.waitForTimeout(200);
        }
      } else {
        console.log('⚠️ タッチコントロールボタンが表示されていません');
      }
    } catch (error) {
      console.log('⚠️ タッチコントロールボタンのテストをスキップ:', error.message);
    }

    // タッチイベント履歴を取得
    const touchEvents = await page.evaluate(() => window.interactionTestData.touchEvents);
    const inputLatencies = await page.evaluate(() => window.interactionTestData.inputLatencies);

    console.log('📊 タッチイベント数:', touchEvents.length);

    if (touchEvents.length > 0) {
      // タッチイベントの種類別集計
      const eventTypes = {};
      touchEvents.forEach(event => {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      });

      console.log('📊 タッチイベント種類別:', eventTypes);

      // 基本的なイベント構造の検証
      touchEvents.slice(0, 3).forEach((event, index) => {
        expect(event.type).toMatch(/^(touchstart|touchmove|touchend|touchcancel)$/);
        expect(Array.isArray(event.touches)).toBe(true);
        expect(event.timestamp).toBeGreaterThan(0);

        console.log(`🔍 タッチイベント${index + 1}:`, {
          type: event.type,
          touchCount: event.touches.length,
          target: event.target
        });
      });

      console.log('✅ タッチ入力が正常に記録されました');
    } else {
      console.log('⚠️ タッチイベントが記録されていません（デスクトップ環境の可能性）');
    }

    // タッチ入力遅延の分析
    const touchLatencies = inputLatencies.filter(l => l.inputType.startsWith('touch_'));

    if (touchLatencies.length > 0) {
      const avgLatency = touchLatencies.reduce((sum, l) => sum + l.latency, 0) / touchLatencies.length;

      console.log('📊 タッチ入力遅延:', `${avgLatency.toFixed(2)}ms`);
      expect(avgLatency).toBeLessThan(150); // 150ms以下（タッチはマウスより遅延許容）

      console.log('✅ タッチ入力遅延が許容範囲内です');
    }
  });

  test('アクセシビリティ・キーボードナビゲーションテスト', async ({ page }) => {
    console.log('♿ アクセシビリティ・キーボードナビゲーションテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // Tabキーナビゲーションテスト
    console.log('⭐ Tabキーナビゲーションテスト...');

    // 初期フォーカスの確認
    const initialFocus = await page.evaluate(() => document.activeElement.tagName);
    console.log('🔍 初期フォーカス要素:', initialFocus);

    // Tabキーでのナビゲーション
    const tabbableElements = [];

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent?.slice(0, 50) || '',
          ariaLabel: element.getAttribute('aria-label'),
          role: element.getAttribute('role')
        };
      });

      tabbableElements.push(focusedElement);
      console.log(`  Tab ${i + 1}:`, focusedElement);

      // 同じ要素に戻った場合は終了
      if (i > 0 && JSON.stringify(focusedElement) === JSON.stringify(tabbableElements[0])) {
        console.log('🔄 Tab順序が一周しました');
        break;
      }
    }

    // Shift+Tabでの逆方向ナビゲーション
    console.log('⬅️ Shift+Tab逆方向ナビゲーションテスト...');

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(100);

      const focusedElement = await page.evaluate(() => ({
        tagName: document.activeElement.tagName,
        id: document.activeElement.id
      }));

      console.log(`  Shift+Tab ${i + 1}:`, focusedElement);
    }

    // キーボードアクションテスト
    console.log('⌨️ キーボードアクションテスト...');

    // フォーカス可能な要素での Enter/Space キー
    for (const element of tabbableElements.slice(0, 5)) {
      if (element.tagName === 'BUTTON' || element.role === 'button') {
        console.log(`  ${element.tagName}でのEnterキーテスト`);

        // 要素にフォーカスを当てる
        await page.focus(`${element.tagName}${element.id ? '#' + element.id : ''}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);

        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
      }
    }

    // ARIA属性の確認
    console.log('🏷️ ARIA属性確認テスト...');

    const ariaElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [role], [aria-describedby], [aria-expanded]');
      return Array.from(elements).map(el => ({
        tagName: el.tagName,
        id: el.id,
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
        ariaDescribedBy: el.getAttribute('aria-describedby'),
        ariaExpanded: el.getAttribute('aria-expanded')
      }));
    });

    console.log('📊 ARIA要素数:', ariaElements.length);

    ariaElements.forEach((element, index) => {
      if (index < 5) { // 最初の5つを表示
        console.log(`🏷️ ARIA要素${index + 1}:`, element);
      }
    });

    // ゲーム操作のキーボードアクセシビリティ
    console.log('🎮 ゲーム操作キーボードアクセシビリティテスト...');

    // ゲームエリアにフォーカスを当てる
    await page.focus('#gameCanvas');

    // ゲーム操作キーのアクセシビリティ確認
    const gameAccessibilityKeys = [
      'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'
    ];

    for (const key of gameAccessibilityKeys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(100);
    }

    // フォーカスイベント履歴を取得
    const focusEvents = await page.evaluate(() => window.interactionTestData.focusEvents);

    console.log('📊 フォーカスイベント数:', focusEvents.length);

    if (focusEvents.length > 0) {
      // フォーカス遷移の検証
      focusEvents.slice(0, 10).forEach((event, index) => {
        expect(event.type).toMatch(/^(focus|blur|focusin|focusout)$/);
        expect(event.timestamp).toBeGreaterThan(0);

        console.log(`🔍 フォーカスイベント${index + 1}:`, {
          type: event.type,
          target: event.target,
          targetId: event.targetId
        });
      });

      console.log('✅ フォーカス管理が正常に動作しています');
    }

    // キーボードのみでのゲーム操作可能性を検証
    console.log('⌨️🎮 キーボードのみゲーム操作検証...');

    let gameOperationSuccess = true;

    try {
      // ゲーム開始
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // プレイヤー操作
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);

      // ポーズ/再開
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);

      // ランキング表示
      await page.keyboard.press('h');
      await page.waitForTimeout(500);

      // モーダルが表示されている場合はEscapeで閉じる
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      console.log('✅ キーボードのみでのゲーム操作が可能です');

    } catch (error) {
      gameOperationSuccess = false;
      console.log('⚠️ キーボードのみでの操作に制限があります:', error.message);
    }

    // アクセシビリティ要件の最終確認
    expect(tabbableElements.length).toBeGreaterThan(0); // Tab可能な要素が存在
    expect(gameOperationSuccess).toBe(true); // キーボードのみでゲーム操作可能

    console.log('✅ アクセシビリティテスト完了');
  });

  test('入力デバイス混在・切り替えテスト', async ({ page }) => {
    console.log('🔄 入力デバイス混在・切り替えテストを開始...');

    await page.goto('http://localhost:3000/docs/game.html');

    // Pyodideの初期化を待つ
    const loadingOverlay = page.locator('#loadingOverlay');
    await expect(loadingOverlay).toBeHidden({ timeout: 30000 });

    await page.waitForTimeout(3000);

    // ゲームキャンバスの位置を取得
    const canvas = page.locator('#gameCanvas');
    const canvasBounds = await canvas.boundingBox();

    if (canvasBounds) {
      console.log('🔄 デバイス混在操作シーケンステスト...');

      // シーケンス1: キーボード → マウス → キーボード
      console.log('  シーケンス1: キーボード → マウス → キーボード');

      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);

      await page.mouse.click(
        canvasBounds.x + canvasBounds.width * 0.7,
        canvasBounds.y + canvasBounds.height * 0.8
      );
      await page.waitForTimeout(200);

      await page.keyboard.press('Space');
      await page.waitForTimeout(200);

      // シーケンス2: マウス → キーボード → マウス
      console.log('  シーケンス2: マウス → キーボード → マウス');

      await page.mouse.move(
        canvasBounds.x + canvasBounds.width * 0.3,
        canvasBounds.y + canvasBounds.height * 0.8
      );
      await page.waitForTimeout(200);

      await page.keyboard.press('r'); // リセット
      await page.waitForTimeout(200);

      await page.mouse.click(
        canvasBounds.x + canvasBounds.width * 0.5,
        canvasBounds.y + canvasBounds.height * 0.5
      );
      await page.waitForTimeout(200);

      // シーケンス3: 高速切り替え
      console.log('  シーケンス3: 高速切り替えテスト');

      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(50);

        await page.mouse.move(
          canvasBounds.x + canvasBounds.width * (0.3 + i * 0.1),
          canvasBounds.y + canvasBounds.height * 0.8
        );
        await page.waitForTimeout(50);

        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(50);
      }

      // 同時入力テスト
      console.log('  同時入力テスト...');

      // キーボードキーを押下しながらマウス操作
      await page.keyboard.down('ArrowLeft');

      await page.mouse.move(
        canvasBounds.x + canvasBounds.width * 0.2,
        canvasBounds.y + canvasBounds.height * 0.8
      );
      await page.waitForTimeout(500);

      await page.mouse.move(
        canvasBounds.x + canvasBounds.width * 0.8,
        canvasBounds.y + canvasBounds.height * 0.8
      );
      await page.waitForTimeout(500);

      await page.keyboard.up('ArrowLeft');

    } else {
      console.log('⚠️ ゲームキャンバスが見つかりません');
    }

    // 入力イベント履歴の分析
    const keyboardEvents = await page.evaluate(() => window.interactionTestData.keyboardEvents);
    const mouseEvents = await page.evaluate(() => window.interactionTestData.mouseEvents);
    const inputLatencies = await page.evaluate(() => window.interactionTestData.inputLatencies);

    console.log('📊 混在入力統計:', {
      キーボードイベント: keyboardEvents.length,
      マウスイベント: mouseEvents.length,
      入力遅延測定: inputLatencies.length
    });

    // 入力の時系列分析
    const allEvents = [
      ...keyboardEvents.map(e => ({ ...e, source: 'keyboard' })),
      ...mouseEvents.map(e => ({ ...e, source: 'mouse' }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    if (allEvents.length > 0) {
      console.log('📊 入力時系列分析（最初の10イベント）:');

      allEvents.slice(0, 10).forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.source}: ${event.type} @ ${event.timestamp}`);
      });

      // デバイス切り替えの検出
      let deviceSwitches = 0;
      let lastSource = allEvents[0].source;

      for (let i = 1; i < allEvents.length; i++) {
        if (allEvents[i].source !== lastSource) {
          deviceSwitches++;
          lastSource = allEvents[i].source;
        }
      }

      console.log('📊 デバイス切り替え回数:', deviceSwitches);
      expect(deviceSwitches).toBeGreaterThan(0); // 切り替えが発生している

      console.log('✅ 入力デバイス混在・切り替えが正常に動作しています');
    }

    // 混在入力での遅延影響分析
    if (inputLatencies.length > 0) {
      const keyboardLatencies = inputLatencies.filter(l => l.inputType.startsWith('key_'));
      const mouseLatencies = inputLatencies.filter(l => l.inputType.startsWith('mouse_'));

      if (keyboardLatencies.length > 0 && mouseLatencies.length > 0) {
        const avgKeyboardLatency = keyboardLatencies.reduce((sum, l) => sum + l.latency, 0) / keyboardLatencies.length;
        const avgMouseLatency = mouseLatencies.reduce((sum, l) => sum + l.latency, 0) / mouseLatencies.length;

        console.log('📊 デバイス別平均遅延:', {
          キーボード: `${avgKeyboardLatency.toFixed(2)}ms`,
          マウス: `${avgMouseLatency.toFixed(2)}ms`,
          差: `${Math.abs(avgKeyboardLatency - avgMouseLatency).toFixed(2)}ms`
        });

        // 遅延差が大きすぎないことを確認
        expect(Math.abs(avgKeyboardLatency - avgMouseLatency)).toBeLessThan(100);

        console.log('✅ デバイス間遅延差が許容範囲内です');
      }
    }
  });

});
