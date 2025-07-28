const { test, expect } = require('@playwright/test');

test('simple console log test', async ({ page }) => {
  const consoleMessages = [];

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log(`Console ${msg.type()}: ${text}`);
    consoleMessages.push(text);
  });

  // Navigate to the game page
  await page.goto('http://localhost:3000/docs/game.html');

  // Wait for page to load and modules to initialize
  await page.waitForTimeout(5000);

  // Try to wait for the metrics collector initialization
  await page.waitForFunction(
    () => window.metricsCollector !== undefined,
    { timeout: 10000 }
  ).catch(err => console.log('Metrics collector not found within timeout'));

  // Log all captured messages
  console.log('\n=== All console messages captured ===');
  consoleMessages.forEach((msg, i) => {
    console.log(`${i}: ${msg}`);
  });

  // Check if metrics collector exists
  const hasCollector = await page.evaluate(() => {
    return typeof window.metricsCollector !== 'undefined';
  });

  console.log(`\nWindow.metricsCollector exists: ${hasCollector}`);

  // Check if it has expected methods
  if (hasCollector) {
    const methods = await page.evaluate(() => {
      const collector = window.metricsCollector;
      return {
        hasStart: typeof collector.start === 'function',
        hasStartCollection: typeof collector.startCollection === 'function',
        hasGetStats: typeof collector.getStats === 'function',
        hasGetSummary: typeof collector.getSummary === 'function'
      };
    });
    console.log('\nMethods available:');
    console.log(JSON.stringify(methods, null, 2));
  }
});
