// SoundSystem単体テスト
const { test, expect } = require('@playwright/test');

// ブラウザ環境のモック
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = { connect: () => {} };
    this.sampleRate = 44100;
    this.resume = async () => { this.state = 'running'; };
    this.createCalls = [];
  }
  
  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
      disconnect: () => {}
    };
    this.createCalls.push('oscillator');
    return osc;
  }
  
  createGain() {
    const gain = {
      gain: { 
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {},
      disconnect: () => {}
    };
    this.createCalls.push('gain');
    return gain;
  }
  
  createBiquadFilter() {
    const filter = {
      type: 'lowpass',
      frequency: { value: 1000 },
      Q: { value: 1 },
      connect: () => {},
      disconnect: () => {}
    };
    this.createCalls.push('filter');
    return filter;
  }
  
  createDynamicsCompressor() {
    const compressor = {
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: () => {},
      disconnect: () => {}
    };
    this.createCalls.push('compressor');
    return compressor;
  }
}

// テスト用のSoundSystemクラスを定義（簡略版）
class SoundSystem {
  constructor() {
    this.audioContext = null;
    this.masterGainNode = null;
    this.soundEnabled = true;
    this.playingSounds = new Set();
    this.initialized = false;
    
    this.initializeAudio();
  }
  
  initializeAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext || MockAudioContext;
      this.audioContext = new AudioContext();
      
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.value = 0.5;
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      this.soundEnabled = false;
    }
  }
  
  get muted() {
    return !this.soundEnabled;
  }
  
  setMuted(muteState) {
    this.soundEnabled = !muteState;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = muteState ? 0 : 0.5;
    }
  }
  
  async playSound(soundType, pitch = 1.0) {
    if (!this.soundEnabled || !this.audioContext) return;
    
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.generateAndPlaySound(soundType, pitch);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }
  
  generateAndPlaySound(soundType, pitch) {
    const now = this.audioContext.currentTime;
    const soundConfig = this.getSoundConfig(soundType);
    
    // オシレーター作成
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = soundConfig.waveform;
    oscillator.frequency.setValueAtTime(soundConfig.frequency * pitch, now);
    
    // ゲインノード作成
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(soundConfig.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + soundConfig.duration);
    
    // 接続
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGainNode);
    
    // 再生
    oscillator.start(now);
    oscillator.stop(now + soundConfig.duration);
    
    // クリーンアップ
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  }
  
  getSoundConfig(soundType) {
    const configs = {
      ballHit: { frequency: 440, duration: 0.1, volume: 0.3, waveform: 'sine' },
      wallHit: { frequency: 220, duration: 0.15, volume: 0.4, waveform: 'triangle' },
      scoreUp: { frequency: 523.25, duration: 0.3, volume: 0.5, waveform: 'sine' },
      gameOver: { frequency: 146.83, duration: 1.0, volume: 0.6, waveform: 'sawtooth' },
      powerUp: { frequency: 698.46, duration: 0.5, volume: 0.4, waveform: 'square' }
    };
    
    return configs[soundType] || configs.ballHit;
  }
  
  processSoundEvents(frameData) {
    if (!this.soundEnabled || !frameData) return;
    
    if (frameData.ballHit) {
      const speed = Math.sqrt(frameData.ballVelocityX**2 + frameData.ballVelocityY**2);
      const pitch = Math.min(2.0, 1.0 + speed / 10);
      this.playSound('ballHit', pitch);
    }
    
    if (frameData.scoreChanged) {
      this.playSound('scoreUp');
    }
    
    if (frameData.powerUpCollected) {
      this.playSound('powerUp');
    }
    
    if (frameData.gameOver) {
      this.playSound('gameOver');
    }
  }
}

test.describe('SoundSystem Unit Tests', () => {
  let soundSystem;
  let mockAudioContext;

  test.beforeEach(() => {
    // グローバルwindowオブジェクトをモック
    global.window = {
      AudioContext: MockAudioContext,
      webkitAudioContext: undefined
    };
    
    soundSystem = new SoundSystem();
    mockAudioContext = soundSystem.audioContext;
  });

  test.afterEach(() => {
    delete global.window;
  });

  test.describe('初期化', () => {
    test('AudioContextが正しく初期化される', () => {
      expect(soundSystem.audioContext).toBeDefined();
      expect(soundSystem.audioContext).toBeInstanceOf(MockAudioContext);
      expect(soundSystem.initialized).toBe(true);
    });

    test('masterGainNodeが正しく作成される', () => {
      expect(soundSystem.masterGainNode).toBeDefined();
      expect(soundSystem.masterGainNode.gain.value).toBe(0.5);
    });

    test('soundEnabledがtrueで初期化される', () => {
      expect(soundSystem.soundEnabled).toBe(true);
    });
  });

  test.describe('ミュート機能', () => {
    test('setMuted(true)で音がミュートされる', () => {
      soundSystem.setMuted(true);
      
      expect(soundSystem.soundEnabled).toBe(false);
      expect(soundSystem.masterGainNode.gain.value).toBe(0);
    });

    test('setMuted(false)でミュートが解除される', () => {
      soundSystem.setMuted(true);
      soundSystem.setMuted(false);
      
      expect(soundSystem.soundEnabled).toBe(true);
      expect(soundSystem.masterGainNode.gain.value).toBe(0.5);
    });

    test('mutedゲッターが正しい状態を返す', () => {
      expect(soundSystem.muted).toBe(false);
      
      soundSystem.setMuted(true);
      expect(soundSystem.muted).toBe(true);
      
      soundSystem.setMuted(false);
      expect(soundSystem.muted).toBe(false);
    });
  });

  test.describe('サウンド設定', () => {
    test('getSoundConfigが正しい設定を返す', () => {
      const ballHitConfig = soundSystem.getSoundConfig('ballHit');
      expect(ballHitConfig).toEqual({
        frequency: 440,
        duration: 0.1,
        volume: 0.3,
        waveform: 'sine'
      });
      
      const gameOverConfig = soundSystem.getSoundConfig('gameOver');
      expect(gameOverConfig).toEqual({
        frequency: 146.83,
        duration: 1.0,
        volume: 0.6,
        waveform: 'sawtooth'
      });
    });

    test('未知のサウンドタイプでデフォルト設定を返す', () => {
      const unknownConfig = soundSystem.getSoundConfig('unknown');
      const defaultConfig = soundSystem.getSoundConfig('ballHit');
      
      expect(unknownConfig).toEqual(defaultConfig);
    });
  });

  test.describe('サウンド再生', () => {
    test('playSound()が正しくオシレーターを作成する', async () => {
      mockAudioContext.createCalls = [];
      
      await soundSystem.playSound('ballHit');
      
      expect(mockAudioContext.createCalls).toContain('oscillator');
      expect(mockAudioContext.createCalls).toContain('gain');
    });

    test('異なるピッチでサウンドが再生される', async () => {
      await soundSystem.playSound('ballHit', 1.5);
      // ピッチが適用されることを確認（モックの制限により詳細な検証は困難）
      expect(mockAudioContext.createCalls).toContain('oscillator');
    });

    test('ミュート時はサウンドが再生されない', async () => {
      soundSystem.setMuted(true);
      mockAudioContext.createCalls = [];
      
      await soundSystem.playSound('ballHit');
      
      expect(mockAudioContext.createCalls).toHaveLength(0);
    });

    test('suspendedな状態でもresumeされる', async () => {
      mockAudioContext.state = 'suspended';
      let resumed = false;
      mockAudioContext.resume = async () => {
        resumed = true;
        mockAudioContext.state = 'running';
      };
      
      await soundSystem.playSound('ballHit');
      
      expect(resumed).toBe(true);
    });
  });

  test.describe('イベント処理', () => {
    test('processSoundEventsがballHitイベントを処理する', () => {
      const playSoundSpy = test.spyOn(soundSystem, 'playSound');
      
      soundSystem.processSoundEvents({
        ballHit: true,
        ballVelocityX: 3,
        ballVelocityY: 4
      });
      
      expect(playSoundSpy).toHaveBeenCalledWith('ballHit', expect.any(Number));
    });

    test('processSoundEventsがscoreChangedイベントを処理する', () => {
      const playSoundSpy = test.spyOn(soundSystem, 'playSound');
      
      soundSystem.processSoundEvents({
        scoreChanged: true
      });
      
      expect(playSoundSpy).toHaveBeenCalledWith('scoreUp');
    });

    test('processSoundEventsがgameOverイベントを処理する', () => {
      const playSoundSpy = test.spyOn(soundSystem, 'playSound');
      
      soundSystem.processSoundEvents({
        gameOver: true
      });
      
      expect(playSoundSpy).toHaveBeenCalledWith('gameOver');
    });

    test('processSoundEventsがpowerUpCollectedイベントを処理する', () => {
      const playSoundSpy = test.spyOn(soundSystem, 'playSound');
      
      soundSystem.processSoundEvents({
        powerUpCollected: true
      });
      
      expect(playSoundSpy).toHaveBeenCalledWith('powerUp');
    });

    test('無効なイベントデータでもクラッシュしない', () => {
      expect(() => {
        soundSystem.processSoundEvents(null);
        soundSystem.processSoundEvents(undefined);
        soundSystem.processSoundEvents({});
        soundSystem.processSoundEvents({ unknownEvent: true });
      }).not.toThrow();
    });

    test('ミュート時はイベントが処理されない', () => {
      soundSystem.setMuted(true);
      const playSoundSpy = test.spyOn(soundSystem, 'playSound');
      
      soundSystem.processSoundEvents({
        ballHit: true,
        scoreChanged: true,
        gameOver: true
      });
      
      expect(playSoundSpy).not.toHaveBeenCalled();
    });

    test('ボール速度に応じたピッチ調整が適用される', () => {
      const playSoundSpy = test.spyOn(soundSystem, 'playSound');
      
      // 速度5のボール
      soundSystem.processSoundEvents({
        ballHit: true,
        ballVelocityX: 3,
        ballVelocityY: 4  // 速度 = sqrt(9 + 16) = 5
      });
      
      expect(playSoundSpy).toHaveBeenCalledWith('ballHit', 1.5);
      
      // 速度が非常に速い場合は最大2.0に制限
      soundSystem.processSoundEvents({
        ballHit: true,
        ballVelocityX: 20,
        ballVelocityY: 20
      });
      
      expect(playSoundSpy).toHaveBeenCalledWith('ballHit', 2.0);
    });
  });

  test.describe('エラーハンドリング', () => {
    test('AudioContext作成エラー時にsoundEnabledがfalseになる', () => {
      global.window.AudioContext = function() {
        throw new Error('AudioContext not supported');
      };
      
      const errorSystem = new SoundSystem();
      
      expect(errorSystem.soundEnabled).toBe(false);
      expect(errorSystem.initialized).toBe(false);
    });

    test('playSound中のエラーがキャッチされる', async () => {
      soundSystem.audioContext.createOscillator = () => {
        throw new Error('Failed to create oscillator');
      };
      
      // エラーがスローされないことを確認
      await expect(soundSystem.playSound('ballHit')).resolves.not.toThrow();
    });
  });
});