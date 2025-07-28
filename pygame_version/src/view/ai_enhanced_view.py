"""
AI強化ゲームビュー（AI統合View層）

個人開発規約遵守:
- TDD必須: AIコメンタリー表示のテスト
- モック禁止: 実際の描画でテスト
- エラー3要素: 表示エラー時の適切なメッセージ

技術移行:
- AIコメンタリー表示機能の追加
- ADA情報の可視化
- 既存ビューの拡張
"""

import pygame
import time
from typing import List, Tuple, Optional
from src.view.pygame_game_view import PygameGameView
from src.model.pygame_game_state import PygameGameState


class AIEnhancedGameView(PygameGameView):
    """
    AI機能を統合した強化版ゲームビュー
    
    責務:
    - AIコメンタリーの表示
    - ADA情報の可視化
    - AI関連UIの描画
    """
    
    def __init__(self, screen: pygame.Surface, width: int = 640, height: int = 480):
        """
        AI強化ビューの初期化
        
        Args:
            screen: pygame.Surface - 描画対象のScreen Surface
            width: int - 画面幅
            height: int - 画面高さ
        """
        super().__init__(screen, width, height)
        
        # AIコメンタリー表示設定
        self.commentary_lines: List[Tuple[str, float]] = []  # (テキスト, タイムスタンプ)
        self.commentary_max_lines = 3
        self.commentary_display_duration = 5.0  # 秒
        self.commentary_fade_duration = 1.0  # 秒
        
        # ADA情報表示設定
        self.show_ada_info = False
        self.ada_info = {
            'difficulty_modifier': 1.0,
            'miss_ratio': 0.0,
            'evaluation_progress': 0
        }
        
        # 追加の色設定
        self.colors.update({
            'commentary_bg': (0, 0, 0, 180),     # 半透明黒
            'commentary_text': (255, 255, 255),   # 白
            'ada_info_bg': (0, 0, 50, 150),      # 半透明青
            'ada_positive': (0, 255, 0),          # 緑（難易度上昇）
            'ada_negative': (255, 0, 0),          # 赤（難易度下降）
            'ada_neutral': (255, 255, 0)          # 黄（変更なし）
        })
        
        # 日本語フォント対応（システムフォントを使用）
        try:
            # Windowsの場合
            self.font_japanese = pygame.font.SysFont('meiryo', 20)
        except:
            try:
                # macOSの場合
                self.font_japanese = pygame.font.SysFont('hiraginosansgb', 20)
            except:
                # Linuxまたはフォールバック
                self.font_japanese = self.font_small
    
    def show_ai_commentary(self, commentary: str):
        """
        AIコメンタリーを表示
        
        Args:
            commentary: str - 表示するコメンタリーテキスト
        """
        current_time = time.time()
        
        # 新しいコメンタリーを追加
        self.commentary_lines.append((commentary, current_time))
        
        # 古いコメンタリーを削除
        self.commentary_lines = [
            (text, timestamp) for text, timestamp in self.commentary_lines
            if current_time - timestamp < self.commentary_display_duration
        ]
        
        # 最大行数を超えたら古いものから削除
        if len(self.commentary_lines) > self.commentary_max_lines:
            self.commentary_lines = self.commentary_lines[-self.commentary_max_lines:]
    
    def update_ada_info(self, ada_info: dict):
        """
        ADA情報を更新
        
        Args:
            ada_info: dict - ADA情報（difficulty_modifier, miss_ratio等）
        """
        self.ada_info.update(ada_info)
    
    def toggle_ada_display(self):
        """ADA情報表示の切り替え"""
        self.show_ada_info = not self.show_ada_info
    
    def _draw_ai_commentary(self):
        """AIコメンタリーを描画"""
        if not self.commentary_lines:
            return
        
        current_time = time.time()
        y_offset = self.height - 150  # 画面下部から150ピクセル上
        
        for i, (text, timestamp) in enumerate(reversed(self.commentary_lines)):
            # 経過時間を計算
            elapsed = current_time - timestamp
            
            # フェード効果の計算
            if elapsed > self.commentary_display_duration - self.commentary_fade_duration:
                alpha = 255 * (self.commentary_display_duration - elapsed) / self.commentary_fade_duration
                alpha = max(0, min(255, int(alpha)))
            else:
                alpha = 255
            
            # 背景の描画（半透明）
            text_surface = self.font_japanese.render(text, True, self.colors['commentary_text'])
            text_rect = text_surface.get_rect()
            
            # 背景矩形
            bg_rect = pygame.Rect(
                10,
                y_offset - i * 30 - 25,
                text_rect.width + 20,
                30
            )
            
            # 半透明背景を描画
            bg_surface = pygame.Surface((bg_rect.width, bg_rect.height))
            bg_surface.set_alpha(int(alpha * 0.7))
            bg_surface.fill(self.colors['commentary_bg'][:3])
            self.screen.blit(bg_surface, bg_rect)
            
            # テキストを描画
            text_surface.set_alpha(alpha)
            self.screen.blit(text_surface, (bg_rect.x + 10, bg_rect.y + 5))
    
    def _draw_ada_info(self, game_state: PygameGameState):
        """ADA情報を描画"""
        if not self.show_ada_info:
            return
        
        # ADA情報パネルの位置
        panel_x = self.width - 200
        panel_y = 10
        panel_width = 190
        panel_height = 120
        
        # 半透明背景
        panel_surface = pygame.Surface((panel_width, panel_height))
        panel_surface.set_alpha(200)
        panel_surface.fill(self.colors['ada_info_bg'][:3])
        self.screen.blit(panel_surface, (panel_x, panel_y))
        
        # 枠線
        pygame.draw.rect(self.screen, self.colors['text_white'], 
                        (panel_x, panel_y, panel_width, panel_height), 2)
        
        # タイトル
        title_text = self.font_small.render("ADA System", True, self.colors['text_white'])
        self.screen.blit(title_text, (panel_x + 10, panel_y + 5))
        
        # 難易度倍率
        modifier = self.ada_info.get('difficulty_modifier', 1.0)
        if modifier > 1.0:
            modifier_color = self.colors['ada_positive']
            modifier_symbol = "↑"
        elif modifier < 1.0:
            modifier_color = self.colors['ada_negative']
            modifier_symbol = "↓"
        else:
            modifier_color = self.colors['ada_neutral']
            modifier_symbol = "="
        
        modifier_text = self.font_small.render(
            f"Difficulty: {modifier:.1f}x {modifier_symbol}",
            True, modifier_color
        )
        self.screen.blit(modifier_text, (panel_x + 10, panel_y + 35))
        
        # ミス率
        miss_ratio = self.ada_info.get('miss_ratio', 0.0)
        miss_ratio_text = self.font_small.render(
            f"Miss Rate: {miss_ratio:.1%}",
            True, self.colors['text_white']
        )
        self.screen.blit(miss_ratio_text, (panel_x + 10, panel_y + 60))
        
        # 評価進捗バー
        progress = self.ada_info.get('evaluation_progress', 0)
        bar_width = panel_width - 20
        bar_height = 10
        bar_x = panel_x + 10
        bar_y = panel_y + 90
        
        # 背景バー
        pygame.draw.rect(self.screen, self.colors['text_gray'],
                        (bar_x, bar_y, bar_width, bar_height))
        
        # 進捗バー
        if progress > 0:
            progress_width = int(bar_width * (progress / 10))  # 10回で評価
            pygame.draw.rect(self.screen, self.colors['text_white'],
                            (bar_x, bar_y, progress_width, bar_height))
        
        # 進捗テキスト
        progress_text = self.font_small.render(f"{progress}/10", True, self.colors['text_white'])
        text_rect = progress_text.get_rect(center=(bar_x + bar_width // 2, bar_y + bar_height // 2))
        self.screen.blit(progress_text, text_rect)
    
    def draw_game(self, game_state: PygameGameState):
        """
        ゲーム画面の描画（AI機能付き）
        
        Args:
            game_state: PygameGameState - 描画するゲーム状態
        """
        # 親クラスの描画を実行
        super().draw_game(game_state)
        
        # AI関連の描画を追加
        self._draw_ai_commentary()
        self._draw_ada_info(game_state)
        
        # 画面更新
        pygame.display.flip()
    
    def update(self, game_state: PygameGameState):
        """
        Observer更新メソッド（AI機能付き）
        
        Args:
            game_state: PygameGameState - 更新されたゲーム状態
        """
        # ゲーム描画
        self.draw_game(game_state)
        
        # ゲームオーバー時の特別なコメンタリー
        if game_state.is_gameover and not hasattr(self, '_gameover_commented'):
            self.show_ai_commentary(f"ゲームオーバー！最終スコア: {game_state.score.point}")
            self._gameover_commented = True
        elif not game_state.is_gameover:
            self._gameover_commented = False