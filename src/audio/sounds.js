const SOUND_PRESETS = {
  shoot: { frequency: 105, endFrequency: 55, duration: 0.09, gain: 0.12, type: 'triangle' },
  collision: { frequency: 520, endFrequency: 310, duration: 0.035, gain: 0.045, type: 'sine' },
  rail: { frequency: 240, endFrequency: 170, duration: 0.045, gain: 0.045, type: 'square' },
  pocket: { frequency: 150, endFrequency: 65, duration: 0.18, gain: 0.1, type: 'sine' },
  foul: { frequency: 180, endFrequency: 125, duration: 0.28, gain: 0.07, type: 'sawtooth' },
  win: { frequency: 440, endFrequency: 660, duration: 0.34, gain: 0.08, type: 'triangle' },
};

export function createSounds() {
  let context;
  let muted = false;
  const lastPlayed = new Map();

  // Audio starts lazily because browsers require a user gesture before playback.
  function getContext() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function play(name, volume = 1, minimumGap = 0) {
    if (muted) return;
    const audio = getContext();
    const preset = SOUND_PRESETS[name];
    if (!audio || !preset) return;

    const now = audio.currentTime;
    if (now - (lastPlayed.get(name) ?? -Infinity) < minimumGap) return;
    lastPlayed.set(name, now);

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(preset.endFrequency, now + preset.duration);
    gain.gain.setValueAtTime(Math.max(0.0001, preset.gain * volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration);
  }

  return {
    playShot: (power) => play('shoot', 0.55 + power * 0.45),
    playCollision: () => play('collision', 1, 0.025),
    playRail: () => play('rail', 1, 0.04),
    playPocket: () => play('pocket'),
    playFoul: () => play('foul'),
    playWin: () => play('win'),
    toggleMuted() {
      muted = !muted;
      return muted;
    },
  };
}
