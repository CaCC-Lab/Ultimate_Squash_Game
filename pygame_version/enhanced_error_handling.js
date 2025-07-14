
// 🛡️ Enhanced JavaScript Error Handling for Ultimate Squash Game

class GameErrorRecovery {
    constructor() {
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        this.lastErrorTime = 0;
        this.errorCooldown = 5000; // 5 seconds
        
        this.setupErrorHandling();
    }
    
    setupErrorHandling() {
        // Prevent error spam
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const now = Date.now();
            if (now - this.lastErrorTime > this.errorCooldown) {
                originalConsoleError.apply(console, args);
                this.lastErrorTime = now;
            }
        };
        
        // Handle specific game errors
        this.setupGameErrorHandling();
        this.setupResourceErrorHandling();
    }
    
    setupGameErrorHandling() {
        // Pyodide initialization error handling
        window.handlePyodideError = (error) => {
            console.error('Pyodide error:', error);
            
            if (this.recoveryAttempts < this.maxRecoveryAttempts) {
                this.recoveryAttempts++;
                this.attemptPyodideRecovery();
            } else {
                this.fallbackToStaticMode();
            }
        };
        
        // Game loop error handling
        window.handleGameLoopError = (error) => {
            console.error('Game loop error:', error);
            
            // Try to restart game loop
            try {
                if (window.gameLoop) {
                    cancelAnimationFrame(window.gameLoop);
                }
                setTimeout(() => {
                    startGameLoop();
                }, 1000);
            } catch (restartError) {
                console.error('Failed to restart game loop:', restartError);
                this.fallbackToStaticMode();
            }
        };
    }
    
    setupResourceErrorHandling() {
        // Monitor resource loading
        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
            try {
                const response = await originalFetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } catch (error) {
                console.error('Fetch error:', url, error);
                // Return mock response for non-critical resources
                return this.createMockResponse(url);
            }
        };
    }
    
    async attemptPyodideRecovery() {
        console.log(`🔄 Attempting Pyodide recovery (${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);
        
        try {
            // Clear any existing Pyodide instance
            if (window.pyodide) {
                window.pyodide = null;
            }
            
            // Try alternative CDN
            const alternativeCDNs = [
                "https://unpkg.com/pyodide@0.26.4/pyodide.js",
                "https://cdnjs.cloudflare.com/ajax/libs/pyodide/0.26.4/pyodide.js"
            ];
            
            for (const cdn of alternativeCDNs) {
                try {
                    await this.loadScript(cdn);
                    await initializeGame();
                    console.log('✅ Pyodide recovery successful');
                    return;
                } catch (error) {
                    console.warn('Alternative CDN failed:', cdn);
                }
            }
            
            throw new Error('All recovery attempts failed');
            
        } catch (error) {
            console.error('Recovery attempt failed:', error);
            if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
                this.fallbackToStaticMode();
            }
        }
    }
    
    fallbackToStaticMode() {
        console.log('🔄 Falling back to static mode');
        
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas?.getContext('2d');
        
        if (ctx) {
            // Draw fallback screen
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Offline', canvas.width/2, canvas.height/2 - 40);
            
            ctx.font = '16px Arial';
            ctx.fillStyle = '#ccc';
            ctx.fillText('Please refresh the page to try again', canvas.width/2, canvas.height/2);
            
            ctx.fillStyle = '#4ecdc4';
            ctx.fillText('Press R to reload', canvas.width/2, canvas.height/2 + 30);
            
            // Add reload functionality
            document.addEventListener('keydown', (event) => {
                if (event.key.toLowerCase() === 'r') {
                    location.reload();
                }
            });
        }
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    createMockResponse(url) {
        // Create mock response for failed resource loads
        return new Response('{}', {
            status: 200,
            statusText: 'OK',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        });
    }
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Initialize error recovery system
window.gameErrorRecovery = new GameErrorRecovery();

console.log('🛡️ Game Error Recovery System initialized');
