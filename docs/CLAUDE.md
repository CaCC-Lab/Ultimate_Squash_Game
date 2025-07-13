# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Python-based Ultimate Squash Game with AI-powered enhancements. The project features a classic squash game built with tkinter, enhanced with AI commentary and dynamic challenges using Ollama integration.

## Essential Commands

### Setup and Installation

```bash
# Install dependencies (basic)
pip install -r requirements.txt

# Install with SSL workaround (recommended)
./run.sh

# Install Ollama model for AI features
ollama pull mistral
```

### Running the Game

```bash
# Standard execution
python main.py

# Alternative using convenience script
./run.sh
```

### Development Commands

```bash
# Test Ollama connectivity
ollama list

# Check Python version (requires 3.8+)
python --version

# Install specific package for debugging
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org <package>
```

## Architecture Overview

### Core Components

The codebase follows a **loosely coupled design** with three main components:

1. **GameEngine** (`game_engine.py`): Self-contained game logic and tkinter-based UI
   - Manages game state, ball physics, racket controls, and scoring
   - Can run independently without AI features
   - Uses tkinter Canvas for rendering and event handling

2. **AI Enhancer** (`ai_enhancer.py`): AI-powered game enhancements via Ollama
   - `OllamaGameEnhancer`: Handles LLM communication and response caching
   - `AIGameModeManager`: Manages dynamic challenges and game modifications
   - Designed for async operation to prevent UI blocking

3. **Main Entry Point** (`main.py`): Minimal orchestrator
   - Currently only instantiates GameEngine
   - **Integration Point**: This is where AI components should be connected

### Current Integration Status

**Important**: The AI components (`ai_enhancer.py`) are currently **not integrated** with the main game engine. The game runs without AI features by default.

### Recommended Integration Patterns

When integrating AI features, consider these architectural patterns:

#### Observer Pattern (Recommended)
- Make `GameEngine` emit events for key game moments (ball hits, misses, score changes)
- Have `AIGameModeManager` observe these events to trigger commentary or challenges
- Maintains loose coupling while enabling reactive AI behavior

#### Dependency Injection
- Pass AI components to `GameEngine` constructor in `main.py`
- Allows GameEngine to use AI features when available without hard dependencies

#### Decorator/Wrapper Pattern
- Wrap `GameEngine` methods with AI enhancements
- Useful for adding AI behavior to existing game methods without modifying core logic

## Key Technical Considerations

### Performance and Threading

- **UI Thread Safety**: tkinter is single-threaded; AI processing must not block the main thread
- **Async Operations**: `ai_enhancer.py` uses `asyncio` for non-blocking Ollama calls
- **Response Caching**: AI responses are cached to improve performance

### Platform Compatibility

- **Sound System**: Current sound implementation only works on Windows (`winsound`)
- **Cross-platform**: Consider `pygame.mixer` for broader OS support
- **Python Version**: Requires Python 3.8+ for modern async features

### External Dependencies

- **Ollama Server**: Must be running locally for AI features to work
- **Model Availability**: Default model is "mistral" - verify availability before AI calls
- **Network Latency**: AI commentary may introduce delays; design accordingly

### Configuration Management

- AI model name is hardcoded as "mistral" in `OllamaGameEnhancer`
- Consider externalizing configuration to JSON file for flexibility
- Graceful degradation when AI services are unavailable

## Development Workflow

### Basic Game Development
1. Modify `game_engine.py` for core game mechanics
2. Test with `python main.py` (AI-free mode)
3. Debug using tkinter's built-in event system

### AI Feature Development
1. Implement new AI logic in `ai_enhancer.py`
2. Modify `main.py` to instantiate and connect AI components
3. Test integration with Ollama running locally
4. Use logging/console output to debug AI responses

### Integration Development
1. Add event emission to `GameEngine` for key game moments
2. Create observer methods in `AIGameModeManager`
3. Update `main.py` to wire components together
4. Test full integration with AI commentary and challenges

## Common Issues and Gotchas

- **tkinter Import**: `requirements.txt` lists `tkinter` but it's included with Python - not needed for pip install
- **SSL Certificates**: Use `run.sh` if encountering pip SSL issues
- **Ollama Connectivity**: Always verify Ollama is running before testing AI features
- **Model Dependencies**: Ensure required Ollama models are downloaded (`ollama pull mistral`)
- **UI Freezing**: Long AI operations will freeze the game UI - use async patterns

## File Structure Notes

- **Single Game Loop**: All game state management happens in `GameEngine.update()`
- **Event Binding**: User input handled via tkinter event binding in `bind_events()`
- **Modular AI**: AI components are completely separate and can be developed independently
- **Minimal Main**: `main.py` is intentionally simple - complexity should remain in component classes