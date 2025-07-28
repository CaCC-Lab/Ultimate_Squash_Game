const { test, expect } = require('@playwright/test');

test('ES6 module loading test', async ({ page }) => {
  const consoleMessages = [];

  page.on('console', msg => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
    consoleMessages.push(msg.text());
  });

  await page.goto('http://localhost:3000/docs/test-module.html');
  await page.waitForTimeout(2000);

  console.log('\n=== All console messages ===');
  consoleMessages.forEach((msg, i) => {
    console.log(`${i}: ${msg}`);
  });

  // Check if module loaded
  const hasScriptStarted = consoleMessages.some(msg => msg.includes('Script started'));
  const hasModuleLoaded = consoleMessages.some(msg => msg.includes('Module loaded'));
  const hasTestValue = consoleMessages.some(msg => msg.includes('Module exports work'));

  console.log(`\nScript started: ${hasScriptStarted}`);
  console.log(`Module loaded: ${hasModuleLoaded}`);
  console.log(`Test value found: ${hasTestValue}`);

  expect(hasScriptStarted).toBe(true);
});
