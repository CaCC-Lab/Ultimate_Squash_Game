const { test, expect } = require('@playwright/test');

test('Debug game.html JavaScript execution', async ({ page }) => {
    const consoleMessages = [];
    const errors = [];
    
    // Capture all console messages
    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        console.log(`[${type}] ${text}`);
        consoleMessages.push({ type, text });
    });
    
    // Capture any errors
    page.on('pageerror', error => {
        console.error('Page error:', error.message);
        errors.push(error.message);
    });
    
    // Navigate to game.html
    console.log('\n=== Loading game.html ===');
    await page.goto('http://localhost:3000/docs/game.html');
    
    // Wait for page to settle
    await page.waitForTimeout(3000);
    
    // Check if our import code exists in the page
    const hasImportCode = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent && script.textContent.includes('Attempting to load performance metrics collector')) {
                return true;
            }
        }
        return false;
    });
    
    console.log(`\nImport code found in DOM: ${hasImportCode}`);
    
    // Try to execute the import directly
    console.log('\n=== Trying direct import ===');
    const importResult = await page.evaluate(async () => {
        try {
            console.log('Direct import: Starting...');
            const module = await import('./js/optimization/performance-metrics-collector.js');
            console.log('Direct import: Success', module);
            return { success: true, hasMetricsCollector: !!module.metricsCollector };
        } catch (error) {
            console.error('Direct import: Failed', error.message);
            return { success: false, error: error.message };
        }
    });
    
    console.log('Import result:', importResult);
    
    // Check window.metricsCollector
    const hasMetricsCollector = await page.evaluate(() => {
        return typeof window.metricsCollector !== 'undefined';
    });
    
    console.log(`\nwindow.metricsCollector exists: ${hasMetricsCollector}`);
    
    // Print all console messages
    console.log('\n=== All console messages ===');
    consoleMessages.forEach((msg, i) => {
        console.log(`${i}: [${msg.type}] ${msg.text}`);
    });
    
    // Print all errors
    if (errors.length > 0) {
        console.log('\n=== Page errors ===');
        errors.forEach((error, i) => {
            console.log(`${i}: ${error}`);
        });
    }
    
    // Check for specific log messages
    const hasAttemptLog = consoleMessages.some(msg => 
        msg.text.includes('Attempting to load performance metrics collector'));
    const hasSuccessLog = consoleMessages.some(msg => 
        msg.text.includes('Performance metrics collector initialized'));
    const hasErrorLog = consoleMessages.some(msg => 
        msg.text.includes('Failed to load performance metrics collector'));
    
    console.log('\n=== Log analysis ===');
    console.log(`Has attempt log: ${hasAttemptLog}`);
    console.log(`Has success log: ${hasSuccessLog}`);
    console.log(`Has error log: ${hasErrorLog}`);
    
    // Basic assertion
    expect(errors.length).toBe(0);
});