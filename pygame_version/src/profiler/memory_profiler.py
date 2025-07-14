"""
メモリ使用量プロファイラー
Phase 3A: メモリ使用量プロファイリング

主な機能:
1. リアルタイムメモリ監視
2. オブジェクト追跡
3. メモリリーク検出
4. GCパフォーマンス分析
5. メモリ使用レポート生成
"""
import gc
import sys
import time
import json
import tracemalloc
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict
import weakref


class MemoryProfiler:
    """メモリ使用量の詳細プロファイリング"""
    
    def __init__(self):
        self.enabled = False
        self.snapshots = []
        self.object_tracker = ObjectTracker()
        self.gc_stats = GCAnalyzer()
        self.memory_pools = {}
        self.peak_usage = 0
        self.start_time = None
        
    def start(self):
        """プロファイリング開始"""
        if self.enabled:
            return
            
        self.enabled = True
        self.start_time = time.time()
        
        # トレースマロックを開始
        tracemalloc.start()
        
        # GC統計を有効化
        gc.set_debug(gc.DEBUG_STATS)
        
        # 初期スナップショット
        self._take_snapshot("initial")
        
    def stop(self):
        """プロファイリング停止"""
        if not self.enabled:
            return
            
        self.enabled = False
        
        # 最終スナップショット
        self._take_snapshot("final")
        
        # トレースマロックを停止
        tracemalloc.stop()
        
        # GCデバッグを無効化
        gc.set_debug(0)
        
    def _take_snapshot(self, label: str):
        """メモリスナップショットを取得"""
        if not self.enabled:
            return
            
        snapshot = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()
        
        # ピーク使用量を更新
        self.peak_usage = max(self.peak_usage, peak)
        
        # スナップショット情報を保存
        self.snapshots.append({
            'label': label,
            'timestamp': time.time() - self.start_time,
            'current_mb': current / 1024 / 1024,
            'peak_mb': peak / 1024 / 1024,
            'snapshot': snapshot,
            'gc_count': gc.get_count(),
            'object_count': len(gc.get_objects())
        })
        
    def analyze_memory_usage(self) -> Dict:
        """メモリ使用量の詳細分析"""
        if len(self.snapshots) < 2:
            return {'error': 'Not enough snapshots for analysis'}
            
        initial = self.snapshots[0]
        final = self.snapshots[-1]
        
        # メモリ増加量
        memory_growth = final['current_mb'] - initial['current_mb']
        
        # トップメモリ使用統計
        top_stats = self._get_top_memory_users(final['snapshot'])
        
        # メモリリーク候補
        potential_leaks = self._detect_potential_leaks()
        
        # GC分析
        gc_analysis = self.gc_stats.analyze()
        
        return {
            'summary': {
                'initial_mb': initial['current_mb'],
                'final_mb': final['current_mb'],
                'peak_mb': self.peak_usage / 1024 / 1024,
                'growth_mb': memory_growth,
                'duration_sec': final['timestamp'],
                'snapshots_count': len(self.snapshots)
            },
            'top_memory_users': top_stats,
            'potential_leaks': potential_leaks,
            'gc_analysis': gc_analysis,
            'object_tracking': self.object_tracker.get_report()
        }
        
    def _get_top_memory_users(self, snapshot, limit: int = 10) -> List[Dict]:
        """メモリ使用量トップのコード位置を取得"""
        top_stats = snapshot.statistics('lineno')[:limit]
        
        return [{
            'filename': stat.traceback.format()[0] if stat.traceback else 'Unknown',
            'size_mb': stat.size / 1024 / 1024,
            'count': stat.count,
            'average_size': stat.size / stat.count if stat.count > 0 else 0
        } for stat in top_stats]
        
    def _detect_potential_leaks(self) -> List[Dict]:
        """潜在的なメモリリークを検出"""
        if len(self.snapshots) < 3:
            return []
            
        leaks = []
        
        # 連続的にメモリが増加しているパターンを検出
        for i in range(1, len(self.snapshots) - 1):
            prev = self.snapshots[i-1]
            curr = self.snapshots[i]
            next = self.snapshots[i+1]
            
            # 単調増加をチェック
            if prev['current_mb'] < curr['current_mb'] < next['current_mb']:
                growth_rate = (next['current_mb'] - prev['current_mb']) / (next['timestamp'] - prev['timestamp'])
                
                if growth_rate > 0.1:  # 0.1MB/秒以上の増加
                    leaks.append({
                        'period': f"{prev['label']} -> {next['label']}",
                        'growth_rate_mb_per_sec': growth_rate,
                        'total_growth_mb': next['current_mb'] - prev['current_mb']
                    })
                    
        return leaks
        
    def profile_function(self, func, *args, **kwargs):
        """特定の関数のメモリ使用量をプロファイル"""
        self._take_snapshot(f"before_{func.__name__}")
        
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        
        self._take_snapshot(f"after_{func.__name__}")
        
        # 関数実行前後の差分を計算
        before = self.snapshots[-2]
        after = self.snapshots[-1]
        
        return {
            'result': result,
            'memory_used_mb': after['current_mb'] - before['current_mb'],
            'execution_time': end_time - start_time,
            'gc_collections': sum(after['gc_count']) - sum(before['gc_count'])
        }


class ObjectTracker:
    """オブジェクトの生成と破棄を追跡"""
    
    def __init__(self):
        self.tracked_types = {}
        self.weak_refs = defaultdict(list)
        
    def track_type(self, type_name: str, cls):
        """特定のクラスのインスタンスを追跡"""
        self.tracked_types[type_name] = cls
        
        # 既存のインスタンスを追跡
        for obj in gc.get_objects():
            if isinstance(obj, cls):
                try:
                    ref = weakref.ref(obj, self._on_object_deleted)
                    self.weak_refs[type_name].append(ref)
                except TypeError:
                    pass  # 弱参照をサポートしないオブジェクト
                    
    def _on_object_deleted(self, ref):
        """オブジェクトが削除されたときのコールバック"""
        # 削除されたオブジェクトの参照をクリーンアップ
        for type_name, refs in self.weak_refs.items():
            if ref in refs:
                refs.remove(ref)
                
    def get_object_counts(self) -> Dict[str, int]:
        """各タイプの生存オブジェクト数を取得"""
        counts = {}
        
        for type_name, refs in self.weak_refs.items():
            # 生存しているオブジェクトのみカウント
            alive_refs = [ref for ref in refs if ref() is not None]
            counts[type_name] = len(alive_refs)
            
            # デッドリファレンスをクリーンアップ
            self.weak_refs[type_name] = alive_refs
            
        return counts
        
    def get_report(self) -> Dict:
        """オブジェクト追跡レポート"""
        return {
            'tracked_types': list(self.tracked_types.keys()),
            'object_counts': self.get_object_counts(),
            'total_tracked': sum(self.get_object_counts().values())
        }


class GCAnalyzer:
    """ガベージコレクション分析"""
    
    def __init__(self):
        self.gc_events = []
        self.start_stats = gc.get_stats()
        
    def record_gc_event(self):
        """GCイベントを記録"""
        self.gc_events.append({
            'timestamp': time.time(),
            'count': gc.get_count(),
            'stats': gc.get_stats()
        })
        
    def analyze(self) -> Dict:
        """GCパフォーマンスを分析"""
        current_stats = gc.get_stats()
        
        # 各世代の統計を分析
        generation_analysis = []
        for i, (start, current) in enumerate(zip(self.start_stats, current_stats)):
            collections = current.get('collections', 0) - start.get('collections', 0)
            collected = current.get('collected', 0) - start.get('collected', 0)
            uncollectable = current.get('uncollectable', 0) - start.get('uncollectable', 0)
            
            generation_analysis.append({
                'generation': i,
                'collections': collections,
                'collected_objects': collected,
                'uncollectable_objects': uncollectable,
                'efficiency': collected / collections if collections > 0 else 0
            })
            
        return {
            'total_collections': sum(g['collections'] for g in generation_analysis),
            'total_collected': sum(g['collected_objects'] for g in generation_analysis),
            'generations': generation_analysis,
            'current_counts': gc.get_count(),
            'threshold': gc.get_threshold()
        }


class MemoryPool:
    """メモリプールの効果測定"""
    
    def __init__(self, object_type, initial_size: int = 10):
        self.object_type = object_type
        self.pool = []
        self.in_use = []
        self.stats = {
            'allocations': 0,
            'reuses': 0,
            'expansions': 0,
            'peak_size': initial_size
        }
        
        # 初期プールを作成
        self._expand_pool(initial_size)
        
    def _expand_pool(self, size: int):
        """プールを拡張"""
        for _ in range(size):
            self.pool.append(self.object_type())
        self.stats['expansions'] += 1
        self.stats['peak_size'] = max(self.stats['peak_size'], len(self.pool) + len(self.in_use))
        
    def acquire(self):
        """オブジェクトを取得"""
        if not self.pool:
            self._expand_pool(10)
            
        obj = self.pool.pop()
        self.in_use.append(obj)
        
        if len(self.in_use) == 1:
            self.stats['allocations'] += 1
        else:
            self.stats['reuses'] += 1
            
        return obj
        
    def release(self, obj):
        """オブジェクトを返却"""
        if obj in self.in_use:
            self.in_use.remove(obj)
            self.pool.append(obj)
            
    def get_stats(self) -> Dict:
        """プール統計を取得"""
        return {
            **self.stats,
            'current_pool_size': len(self.pool),
            'in_use_count': len(self.in_use),
            'reuse_rate': self.stats['reuses'] / (self.stats['allocations'] + self.stats['reuses']) if (self.stats['allocations'] + self.stats['reuses']) > 0 else 0
        }


def create_memory_report(profiler: MemoryProfiler) -> str:
    """詳細なメモリレポートを生成"""
    analysis = profiler.analyze_memory_usage()
    
    report = f"""
# メモリ使用量プロファイリングレポート

## サマリー
- 初期メモリ: {analysis['summary']['initial_mb']:.2f} MB
- 最終メモリ: {analysis['summary']['final_mb']:.2f} MB
- ピーク使用量: {analysis['summary']['peak_mb']:.2f} MB
- メモリ増加: {analysis['summary']['growth_mb']:.2f} MB
- 測定時間: {analysis['summary']['duration_sec']:.2f} 秒

## トップメモリ使用
"""
    
    for i, user in enumerate(analysis['top_memory_users'][:5], 1):
        report += f"{i}. {user['filename']}\n"
        report += f"   - サイズ: {user['size_mb']:.2f} MB\n"
        report += f"   - オブジェクト数: {user['count']}\n"
        
    if analysis['potential_leaks']:
        report += "\n## 潜在的なメモリリーク\n"
        for leak in analysis['potential_leaks']:
            report += f"- {leak['period']}: {leak['growth_rate_mb_per_sec']:.3f} MB/秒\n"
    else:
        report += "\n## メモリリーク: 検出されず ✅\n"
        
    report += f"\n## ガベージコレクション分析\n"
    report += f"- 総コレクション数: {analysis['gc_analysis']['total_collections']}\n"
    report += f"- 回収オブジェクト数: {analysis['gc_analysis']['total_collected']}\n"
    
    return report