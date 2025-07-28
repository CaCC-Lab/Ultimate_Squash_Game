# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a browser-based Ultimate Squash Game implemented in JavaScript. The project features a classic squash/pong game with AI enhancements, WebSocket support for real-time multiplayer, and comprehensive testing infrastructure.

## Essential Commands

### Development Server

```bash
# Start local development server (Python)
python -m http.server 8000

# Or using Node.js
npx http-server docs -p 8000

# Then open in browser
open http://localhost:8000
```

### Testing Commands

```bash
# Run all E2E tests
npm test

# Run specific test suites
npm run test:e2e:websocket
npm run test:e2e:challenge
npm run test:e2e:integration

# Run with UI mode for debugging
npm run test:ui

# Run unit tests
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
```

### Code Quality Commands

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Type checking
npm run type-check
npm run type-check:watch
```

## Architecture Overview

### Core Game Engine (`docs/js/game.js`)
- Self-contained game logic using Canvas API
- Handles physics, collision detection, and rendering
- Event-driven architecture for user input
- AI opponent with difficulty levels

### AI System (`docs/js/ai/`)
- **OllamaGameEnhancer**: LLM integration for dynamic commentary
- **AIGameModeManager**: Manages AI-powered game challenges
- **GameEventBridge**: Connects game events to AI system
- Response caching for performance optimization

### WebSocket Integration (`docs/js/websocket/`)
- Real-time multiplayer support
- Authentication and security features
- Automatic reconnection with exponential backoff
- Message queuing and retry mechanisms

### Challenge System (`docs/js/challenge/`)
- Dynamic challenge generation
- Progress tracking and rewards
- Weekly challenges with leaderboards
- Integration with game mechanics

### Analytics & Monitoring (`docs/js/analytics/`)
- Performance tracking
- Network monitoring
- User behavior analytics
- Error tracking and reporting

### Security Features (`docs/js/security/`)
- Content Security Policy (CSP) implementation
- XSS protection mechanisms
- Secure WebSocket authentication
- Input validation and sanitization

## Key Technical Features

### Performance Optimizations
- Web Worker integration for heavy computations
- Response caching for AI interactions
- Lazy loading of non-critical resources
- Memory efficiency monitoring

### Testing Infrastructure
- Playwright for E2E testing
- Jest for unit testing
- Coverage reporting
- Performance benchmarking

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Progressive enhancement approach
- Fallback for missing features

## Development Guidelines

### Code Style
- ES6+ JavaScript with modules
- JSDoc annotations for type safety
- Consistent naming conventions
- Comprehensive error handling

### Testing Requirements
- Write tests for new features
- Maintain >80% code coverage
- E2E tests for critical user flows
- Performance regression tests

### Security Best Practices
- Never expose API keys in client code
- Validate all user inputs
- Use CSP headers appropriately
- Regular security audits

## Configuration

### Environment Setup
Create a `docs/js/config.js` file (not committed) for local configuration:

```javascript
window.APP_CONFIG = {
    rankingSecretKey: 'your-secret-key',
    apiBaseUrl: 'http://localhost:3000',
    debug: true
};
```

### ESLint Configuration
The project uses ESLint with a gradual adoption strategy. Configuration is in `eslint.config.js`.

### TypeScript Support
TypeScript checking is enabled via JSDoc annotations. Use `npm run type-check` to validate types.

## Common Tasks

### Adding a New Feature
1. Create feature branch
2. Implement with TDD approach
3. Add E2E tests
4. Update documentation
5. Submit PR with tests passing

### Debugging
1. Use browser DevTools
2. Enable debug mode in config
3. Check console for detailed logs
4. Use Playwright UI mode for E2E debugging

### Performance Optimization
1. Use Performance Dashboard (`Shift+P`)
2. Monitor memory usage
3. Check network requests
4. Profile with Chrome DevTools

## Troubleshooting

### Common Issues
- **Game not loading**: Check browser console for errors
- **WebSocket connection failed**: Verify server is running
- **AI features not working**: Ensure Ollama is installed and running
- **Tests failing**: Update Playwright browsers with `npx playwright install`

### Debug Mode
Enable debug mode by adding `?debug=true` to the URL or setting `debug: true` in config.js.

## Project Structure
```
docs/
├── index.html          # Main game page
├── js/
│   ├── game.js        # Core game engine
│   ├── ai/            # AI system components
│   ├── analytics/     # Analytics and monitoring
│   ├── challenge/     # Challenge system
│   ├── ranking/       # Leaderboard system
│   ├── security/      # Security features
│   ├── utils/         # Utility functions
│   └── websocket/     # WebSocket integration
└── assets/            # Game assets

tests/
├── e2e/              # End-to-end tests
├── unit/             # Unit tests
└── integration/      # Integration tests
```