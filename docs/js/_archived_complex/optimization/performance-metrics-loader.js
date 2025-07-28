// Performance Metrics Loader
// This module ensures the performance metrics collector loads properly
// even if there are errors in other scripts

(function() {
    'use strict';
    
    console.log('Performance metrics loader initializing...');
    
    // Function to load the performance metrics collector
    async function loadPerformanceMetrics() {
        try {
            console.log('Loading performance metrics collector module...');
            const module = await import('./performance-metrics-collector.js');
            
            if (module && module.metricsCollector) {
                window.metricsCollector = module.metricsCollector;
                console.log('Performance metrics collector initialized successfully');
                
                // Start collection automatically
                window.metricsCollector.start();
                console.log('Performance metrics collection started');
                
                // Set up keyboard shortcut for debug mode
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'd' || event.key === 'D') {
                        if (window.metricsCollector) {
                            window.metricsCollector.toggleDebugMode();
                        }
                    }
                });
                
                return true;
            } else {
                console.error('Performance metrics module loaded but metricsCollector not found');
                return false;
            }
        } catch (error) {
            console.error('Failed to load performance metrics collector:', error);
            console.error('Error details:', error.message, error.stack);
            return false;
        }
    }
    
    // Load immediately if DOM is already loaded, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPerformanceMetrics);
    } else {
        // DOM is already loaded
        loadPerformanceMetrics();
    }
    
    // Also expose the loader function globally for debugging
    window.loadPerformanceMetrics = loadPerformanceMetrics;
})();