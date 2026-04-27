/**
 * SENTINEL Tactical TTS Utility
 * Optimized for natural-sounding, authoritative emergency broadcasts.
 */

const playEarcon = (mode) => {
  if (!window.AudioContext && !window.webkitAudioContext) return Promise.resolve();
  
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (mode === 'EMERGENCY' || mode === 'RESCUE') {
    // Tactical tactical pulse: low authoritative frequency
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    // Second pulse
    const nextPulse = now + 0.2;
    osc.frequency.setValueAtTime(120, nextPulse);
    osc.frequency.exponentialRampToValueAtTime(40, nextPulse + 0.15);
    
    gain.gain.setValueAtTime(0, nextPulse);
    gain.gain.linearRampToValueAtTime(0.1, nextPulse + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, nextPulse + 0.15);

    osc.start(now);
    osc.stop(now + 0.5);
  } else {
    // Nominal chime: harmonic and reassuring
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.5); // A4
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  return new Promise(resolve => {
    setTimeout(() => {
      ctx.close();
      resolve();
    }, 600);
  });
};

export const speakTactical = async (text, language = 'en-US', mode = 'NOMINAL', onEnd) => {
  if (!window.speechSynthesis) return;

  // 1. Play procedural earcon first
  await playEarcon(mode);

  const startSpeech = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;

    const voices = window.speechSynthesis.getVoices();
    
    // Prioritize high-quality voices (Google, Microsoft Natural, or Apple Premium)
    const bestVoice = voices.find(v =>
      v.lang.startsWith(language.split('-')[0]) &&
      (v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Natural"))
    ) || voices.find(v => v.lang.startsWith(language.split('-')[0]));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Dynamic Tactical adjustments based on mode
    if (mode === 'EMERGENCY' || mode === 'RESCUE') {
      utterance.pitch = 0.85; // Deeper, more authoritative
      utterance.rate = 0.85;  // Slower for clarity in crisis
    } else {
      utterance.pitch = 1.0;  // Standard neutral pitch
      utterance.rate = 0.95;  // Slightly faster, efficient but calm
    }

    if (onEnd) utterance.onend = onEnd;

    // Cancel any existing speech to prevent overlaps
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Chrome/Edge often load voices asynchronously. 
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      startSpeech();
      window.speechSynthesis.onvoiceschanged = null;
    };
  } else {
    startSpeech();
  }
};
