# Python バンドリング レポート

## 概要
- **総モジュール数**: 11
- **総サイズ**: 156,445 bytes (152.8 KB)
- **総クラス数**: 20
- **総関数数**: 169

## モジュール詳細
| モジュール | サイズ | クラス | 関数 | 依存関係 |
|-----------|--------|--------|------|----------|
| controller.web_game_controller | 13,207B | 2 | 18 | view.web_game_view, model.pygame_game_state |
| controller.web_game_controller_enhanced | 13,321B | 0 | 0 | なし |
| controller.pygame_game_controller | 10,630B | 2 | 15 | model.pygame_game_state, view.pygame_game_view |
| model.pygame_game_state_enhanced | 11,148B | 0 | 0 | なし |
| model.pygame_game_state | 10,470B | 5 | 30 | なし |
| view.web_game_view | 12,211B | 2 | 13 | model.pygame_game_state |
| view.raf_optimized_web_view | 21,513B | 1 | 23 | model.pygame_game_state |
| view.pygame_game_view | 11,057B | 2 | 14 | model.pygame_game_state |
| view.optimized_web_game_view_enhanced | 19,813B | 1 | 17 | model.pygame_game_state |
| view.optimized_web_game_view | 20,288B | 1 | 17 | model.pygame_game_state |
| profiler.memory_profiler | 12,787B | 4 | 22 | なし |

## 依存関係順序
1. model.pygame_game_state
2. view.web_game_view
3. controller.web_game_controller
4. controller.web_game_controller_enhanced
5. view.pygame_game_view
6. controller.pygame_game_controller
7. model.pygame_game_state_enhanced
8. view.raf_optimized_web_view
9. view.optimized_web_game_view_enhanced
10. view.optimized_web_game_view
11. profiler.memory_profiler

## 最適化効果予測
- **ネットワーク削減**: 約550ms
- **パース時間削減**: 約156.4ms
- **総削減予測**: 約706.4ms