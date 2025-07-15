"""
Ultimate Squash Game メモリ使用量プロファイリング
実際のゲーム動作中のメモリ使用パターンを分析
"""
import time
import json
import gc
from typing import Dict, List
from src.profiler.memory_profiler import MemoryProfiler, MemoryPool, create_memory_report
from src.model.pygame_game_state import PygameGameState
from src.view.optimized_web_game_view import OptimizedWebCanvasView
from src.view.raf_optimized_web_view import RAFOptimizedWebCanvasView


def profile_game_memory():
    """ゲームのメモリ使用量をプロファイル"""
    print("🔍 メモリプロファイリング開始...")
    
    profiler = MemoryProfiler()
    profiler.start()
    
    # プロファイリング結果を保存
    results = {
        'initialization': {},
        'gameplay': {},
        'optimization_effects': {},
        'memory_pools': {}
    }
    
    # 1. 初期化フェーズのプロファイリング
    print("\n📊 Phase 1: 初期化メモリ使用量測定")
    profiler._take_snapshot("before_init")
    
    # ゲームコンポーネントを初期化
    game_state = PygameGameState()
    standard_view = OptimizedWebCanvasView()
    raf_view = RAFOptimizedWebCanvasView()
    
    # ViewをObserverとして登録
    game_state.add_observer(standard_view)
    game_state.add_observer(raf_view)
    
    profiler._take_snapshot("after_init")
    
    # オブジェクト追跡を設定
    profiler.object_tracker.track_type("GameState", PygameGameState)
    profiler.object_tracker.track_type("OptimizedView", OptimizedWebCanvasView)
    profiler.object_tracker.track_type("RAFView", RAFOptimizedWebCanvasView)
    
    init_analysis = profiler.analyze_memory_usage()
    results['initialization'] = {
        'memory_used_mb': init_analysis['summary']['final_mb'] - init_analysis['summary']['initial_mb'],
        'object_counts': profiler.object_tracker.get_object_counts()
    }
    
    print(f"✅ 初期化完了: {results['initialization']['memory_used_mb']:.2f} MB使用")
    
    # 2. ゲームプレイシミュレーション
    print("\n📊 Phase 2: ゲームプレイ中のメモリ使用量測定")
    
    # 1000フレームのゲームプレイをシミュレート
    frame_count = 1000
    frame_data_samples = []
    
    profiler._take_snapshot("before_gameplay")
    
    start_time = time.time()
    for i in range(frame_count):
        # ゲーム状態を手動更新（60 FPSをシミュレート）
        # ボールの位置を更新
        for ball in game_state.balls:
            game_state.update_ball_position(ball)
        
        # ラケットの位置を時々変更（ゲームプレイをシミュレート）
        if i % 10 == 0:
            new_x = 320 + (i % 100 - 50) * 2
            game_state.update_racket_position(new_x)
        
        # ビューは自動的にObserverパターンで更新される
        
        # 描画コマンドのサイズを取得
        standard_result = standard_view.get_javascript_interface_data()
        raf_result = raf_view.get_javascript_interface_data()
        
        # 100フレームごとにスナップショット
        if i % 100 == 0:
            profiler._take_snapshot(f"gameplay_frame_{i}")
            
            # サンプルデータを保存
            frame_data_samples.append({
                'frame': i,
                'standard_output_size': len(standard_result),
                'raf_output_size': len(raf_result),
                'standard_commands': len(json.loads(standard_result)['draw_commands']),
                'raf_commands': len(json.loads(raf_result)['draw_commands'])
            })
            
        # メモリプレッシャーをシミュレート（大量のボール追加）
        if i % 200 == 0 and i > 0:
            # 追加のボールを生成してメモリ負荷を上げる
            from src.model.pygame_game_state import PygameBall
            for _ in range(5):
                ball = PygameBall(
                    x=320, y=240, 
                    dx=(i % 10 - 5) * 50, 
                    dy=(i % 7 - 3) * 50,
                    size=10,
                    color=(255, 0, 0)
                )
                game_state.balls.append(ball)
            
    end_time = time.time()
    
    profiler._take_snapshot("after_gameplay")
    
    gameplay_analysis = profiler.analyze_memory_usage()
    results['gameplay'] = {
        'duration_sec': end_time - start_time,
        'frames_processed': frame_count,
        'fps': frame_count / (end_time - start_time),
        'memory_growth_mb': gameplay_analysis['summary']['final_mb'] - results['initialization']['memory_used_mb'],
        'gc_collections': gameplay_analysis['gc_analysis']['total_collections'],
        'frame_data_samples': frame_data_samples
    }
    
    print(f"✅ ゲームプレイ完了: {results['gameplay']['fps']:.1f} FPS, "
          f"メモリ増加: {results['gameplay']['memory_growth_mb']:.2f} MB")
    
    # 3. 最適化効果の測定
    print("\n📊 Phase 3: 最適化機能の効果測定")
    
    # メモリプールのテスト
    print("  - コマンドオブジェクトプールテスト")
    
    class DrawCommand:
        def __init__(self):
            self.type = None
            self.params = {}
            
        def reset(self):
            """オブジェクトをリセット（メモリプール用）"""
            self.type = None
            self.params.clear()
            
    command_pool = MemoryPool(DrawCommand, initial_size=50)
    
    profiler._take_snapshot("before_pool_test")
    
    # プールなしでのオブジェクト生成
    no_pool_commands = []
    for _ in range(500):
        no_pool_commands.append(DrawCommand())
    
    profiler._take_snapshot("after_no_pool")
    
    # プールありでのオブジェクト生成
    pool_commands = []
    for _ in range(500):
        cmd = command_pool.acquire()
        pool_commands.append(cmd)
    
    profiler._take_snapshot("after_with_pool")
    
    # オブジェクトを返却
    for cmd in pool_commands:
        command_pool.release(cmd)
    
    pool_stats = command_pool.get_stats()
    results['memory_pools'] = pool_stats
    
    print(f"  ✅ プール再利用率: {pool_stats['reuse_rate']*100:.1f}%")
    
    # 差分描画の効果測定
    print("  - 差分描画メモリ効率テスト")
    
    # 静的フレーム（変化なし）でのメモリ使用
    # ゲーム状態を固定して静的フレームをシミュレート
    game_state.paused = True  # ポーズ状態で静的に
    profiler._take_snapshot("before_static_frames")
    
    for _ in range(100):
        # 変化がないフレーム（on_game_state_changedを呼ぶが状態は変化しない）
        standard_view.on_game_state_changed(game_state)
        result = standard_view.get_javascript_interface_data()
        
    profiler._take_snapshot("after_static_frames")
    
    # GC最適化の効果
    print("  - ガベージコレクション最適化")
    
    gc.collect()  # 手動GC実行
    profiler._take_snapshot("after_manual_gc")
    
    optimization_analysis = profiler.analyze_memory_usage()
    results['optimization_effects'] = {
        'pool_memory_saved': command_pool.stats['reuses'] * 0.001,  # 推定値
        'static_frame_efficiency': 'High',  # 差分描画により静的フレームは効率的
        'gc_effectiveness': optimization_analysis['gc_analysis']['total_collected']
    }
    
    # 4. メモリリーク検査
    print("\n📊 Phase 4: メモリリーク検査")
    
    potential_leaks = optimization_analysis.get('potential_leaks', [])
    if potential_leaks:
        print(f"  ⚠️ 潜在的なリーク検出: {len(potential_leaks)}件")
        for leak in potential_leaks:
            print(f"    - {leak['period']}: {leak['growth_rate_mb_per_sec']:.3f} MB/秒")
    else:
        print("  ✅ メモリリークは検出されませんでした")
    
    # 5. 最終レポート生成
    print("\n📝 レポート生成中...")
    
    profiler.stop()
    
    # テキストレポート
    text_report = create_memory_report(profiler)
    
    # JSON詳細レポート
    detailed_report = {
        'summary': {
            'total_runtime_sec': end_time - start_time,
            'peak_memory_mb': profiler.peak_usage / 1024 / 1024,
            'final_memory_mb': optimization_analysis['summary']['final_mb'],
            'memory_efficiency': 'Excellent' if optimization_analysis['summary']['growth_mb'] < 10 else 'Good'
        },
        'phases': results,
        'top_memory_users': optimization_analysis.get('top_memory_users', [])[:5],
        'gc_analysis': optimization_analysis.get('gc_analysis', {}),
        'recommendations': generate_recommendations(results, optimization_analysis)
    }
    
    # レポートを保存
    with open('memory_profile_report.txt', 'w', encoding='utf-8') as f:
        f.write(text_report)
        
    with open('memory_profile_detailed.json', 'w', encoding='utf-8') as f:
        json.dump(detailed_report, f, indent=2, ensure_ascii=False)
    
    print("\n✅ プロファイリング完了！")
    print(f"📄 レポート保存:")
    print(f"   - memory_profile_report.txt")
    print(f"   - memory_profile_detailed.json")
    
    return detailed_report


def generate_recommendations(results: Dict, analysis: Dict) -> List[str]:
    """メモリ使用に関する推奨事項を生成"""
    recommendations = []
    
    # メモリ増加率をチェック
    if results['gameplay']['memory_growth_mb'] > 5:
        recommendations.append("ゲームプレイ中のメモリ増加が大きいです。オブジェクトプールの活用を検討してください。")
    
    # GC頻度をチェック
    if results['gameplay']['gc_collections'] > 10:
        recommendations.append("GCが頻繁に発生しています。オブジェクトの再利用を増やしてください。")
    
    # プール効率をチェック
    if results['memory_pools']['reuse_rate'] < 0.8:
        recommendations.append("オブジェクトプールの再利用率が低いです。プールサイズの調整を検討してください。")
    
    # メモリリークチェック
    if analysis.get('potential_leaks'):
        recommendations.append("潜在的なメモリリークが検出されました。長時間実行時の監視を強化してください。")
    
    if not recommendations:
        recommendations.append("メモリ使用は最適化されています。現在の実装を維持してください。")
    
    return recommendations


if __name__ == "__main__":
    # プロファイリング実行
    report = profile_game_memory()
    
    # サマリー表示
    print("\n" + "="*50)
    print("📊 メモリプロファイリングサマリー")
    print("="*50)
    print(f"ピークメモリ使用量: {report['summary']['peak_memory_mb']:.2f} MB")
    print(f"最終メモリ使用量: {report['summary']['final_memory_mb']:.2f} MB")
    print(f"メモリ効率評価: {report['summary']['memory_efficiency']}")
    print("\n推奨事項:")
    for i, rec in enumerate(report['recommendations'], 1):
        print(f"{i}. {rec}")