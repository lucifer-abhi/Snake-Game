class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.init();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    frequency: number,
    type: OscillatorType,
    duration: number,
    gainSequence: { time: number; value: number }[],
    freqSequence?: { time: number; value: number }[]
  ) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      if (freqSequence) {
        freqSequence.forEach(step => {
          if (this.ctx) {
            osc.frequency.setValueAtTime(step.value, this.ctx.currentTime + step.time);
          }
        });
      }

      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainSequence.forEach(step => {
        if (this.ctx) {
          gainNode.gain.linearRampToValueAtTime(step.value, this.ctx.currentTime + step.time);
        }
      });

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play sound', e);
    }
  }

  public playEatNormal() {
    this.playTone(
      300,
      'triangle',
      0.15,
      [
        { time: 0.02, value: 0.15 },
        { time: 0.1, value: 0.05 },
        { time: 0.15, value: 0 }
      ],
      [
        { time: 0.05, value: 450 },
        { time: 0.1, value: 600 }
      ]
    );
  }

  public playEatGolden() {
    this.playTone(
      440,
      'sine',
      0.3,
      [
        { time: 0.03, value: 0.2 },
        { time: 0.15, value: 0.15 },
        { time: 0.3, value: 0 }
      ],
      [
        { time: 0.08, value: 554.37 },
        { time: 0.16, value: 659.25 },
        { time: 0.24, value: 880 }
      ]
    );
  }

  public playEatSpeed() {
    this.playTone(
      200,
      'sawtooth',
      0.25,
      [
        { time: 0.02, value: 0.1 },
        { time: 0.1, value: 0.08 },
        { time: 0.25, value: 0 }
      ],
      [
        { time: 0.05, value: 400 },
        { time: 0.12, value: 300 },
        { time: 0.2, value: 600 }
      ]
    );
  }

  public playEatReduce() {
    this.playTone(
      600,
      'sine',
      0.25,
      [
        { time: 0.02, value: 0.15 },
        { time: 0.15, value: 0.08 },
        { time: 0.25, value: 0 }
      ],
      [
        { time: 0.08, value: 450 },
        { time: 0.18, value: 300 }
      ]
    );
  }

  public playCrash() {
    this.playTone(
      180,
      'sawtooth',
      0.6,
      [
        { time: 0.05, value: 0.25 },
        { time: 0.2, value: 0.15 },
        { time: 0.6, value: 0 }
      ],
      [
        { time: 0.1, value: 120 },
        { time: 0.3, value: 60 },
        { time: 0.5, value: 30 }
      ]
    );
  }

  public playLevelUp() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.playTone(
      523.25, // C5
      'triangle',
      0.4,
      [
        { time: 0.05, value: 0.15 },
        { time: 0.2, value: 0.15 },
        { time: 0.4, value: 0 }
      ],
      [
        { time: 0.1, value: 659.25 }, // E5
        { time: 0.2, value: 783.99 }, // G5
        { time: 0.3, value: 1046.50 } // C6
      ]
    );
  }

  public playPause() {
    this.playTone(
      400,
      'sine',
      0.15,
      [
        { time: 0.02, value: 0.1 },
        { time: 0.15, value: 0 }
      ],
      [
        { time: 0.1, value: 250 }
      ]
    );
  }

  public playUnpause() {
    this.playTone(
      250,
      'sine',
      0.15,
      [
        { time: 0.02, value: 0.1 },
        { time: 0.15, value: 0 }
      ],
      [
        { time: 0.1, value: 400 }
      ]
    );
  }

  public playClick() {
    this.playTone(
      800,
      'sine',
      0.05,
      [
        { time: 0.01, value: 0.08 },
        { time: 0.05, value: 0 }
      ]
    );
  }
}

export const sound = new SoundManager();
