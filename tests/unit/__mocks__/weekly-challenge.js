// モックモジュールの例
export const WeeklyChallenge = {
  init: jest.fn(),
  loadChallenge: jest.fn().mockResolvedValue({
    id: 'test-challenge',
    title: 'Test Challenge',
    description: 'Test Description',
  }),
  submitScore: jest.fn().mockResolvedValue({ success: true }),
  getLeaderboard: jest.fn().mockResolvedValue([]),
};

export default WeeklyChallenge;