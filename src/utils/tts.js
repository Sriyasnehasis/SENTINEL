/**
 * SENTINEL Tactical TTS Utility
 * Optimized for natural-sounding, authoritative emergency broadcasts.
 */

export const speakTactical = (text, language = 'en-US', onEnd) => {
  if (!window.speechSynthesis) return;

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

    // Tactical tone adjustments
    utterance.pitch = 0.95; // Slightly deeper, authoritative
    utterance.rate = 0.9;   // Slightly slower, calmer for crisis clarity

    if (onEnd) utterance.onend = onEnd;

    // Cancel any existing speech to prevent overlaps
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Chrome/Edge often load voices asynchronously. 
  // If voices are empty, we need to wait or try again.
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      startSpeech();
      window.speechSynthesis.onvoiceschanged = null; // Prevent multi-triggers
    };
  } else {
    startSpeech();
  }
};

