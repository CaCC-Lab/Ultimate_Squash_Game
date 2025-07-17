import { RankingAPI } from './ranking-api.js';
import { RankingUI } from './ranking-ui.js';
import { RankingController } from './ranking-controller.js';

document.addEventListener('DOMContentLoaded', () => {
  const apiBaseUrl = (typeof process !== 'undefined' && process.env && process.env.VERCEL_URL)
    ? `https://${process.env.VERCEL_URL}/api/scores`
    : '/api/scores';

  const rankingApi = new RankingAPI(apiBaseUrl);
  
  const rankingContainer = document.createElement('div');
  rankingContainer.id = 'rankingContainer';
  document.body.appendChild(rankingContainer);
  const rankingUI = new RankingUI(rankingContainer);

  const rankingController = new RankingController(rankingApi, rankingUI);

  // Make it globally accessible if needed, for example, for game integration
  window.rankingController = rankingController;
});

