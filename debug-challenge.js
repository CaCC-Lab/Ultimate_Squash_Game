#!/usr/bin/env node
/**
 * チャレンジシステムのデバッグスクリプト
 */

console.log('🔍 チャレンジシステムデバッグ開始...');

try {
  const { WeeklyChallenge, calculateWeekNumber, CHALLENGE_EPOCH } = require('./docs/js/weekly-challenge.js');

  const currentDate = new Date();
  console.log(`📅 現在日時: ${currentDate.toISOString()}`);
  console.log(`📅 CHALLENGE_EPOCH: ${CHALLENGE_EPOCH}`);

  const weekNumber = calculateWeekNumber(currentDate, CHALLENGE_EPOCH);
  console.log(`📊 計算された週番号: ${weekNumber}`);

  const challenge = new WeeklyChallenge(currentDate);
  console.log('🏆 WeeklyChallenge インスタンス作成完了');

  const challengeInfo = challenge.getChallengeInfo();
  console.log('📋 チャレンジ情報:', challengeInfo);

  if (challengeInfo === null) {
    console.log('⚠️ challengeInfo が null です。理由を調査中...');

    // 詳細デバッグ
    const seed = challenge.getSeed();
    console.log(`🌱 シード値: ${seed}`);

    // エポック日の詳細確認
    const epochDate = new Date(CHALLENGE_EPOCH);
    console.log(`📅 エポック日詳細: ${epochDate.toISOString()}`);
    console.log(`📅 エポック日（ローカル時間）: ${epochDate.toLocaleString('ja-JP')}`);

    // 現在日時との差を確認
    const diffMs = currentDate.getTime() - epochDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    console.log(`⏰ エポックからの差: ${diffDays}日 (${diffMs}ms)`);

    if (diffMs < 0) {
      console.log('❌ 現在日時がエポック日より前です');
    } else {
      console.log('✅ 現在日時がエポック日より後です');
    }
  }

} catch (error) {
  console.error('❌ エラー:', error);
  console.error('スタックトレース:', error.stack);
}
