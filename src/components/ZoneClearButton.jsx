import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

/**
 * ZoneClearButton — Staff component to mark evacuation zone as clear
 * and play multilingual TTS announcements.
 *
 * TTS Strategy:
 *  1. Try Cloud TTS via Render.com /tts endpoint (gTTS — better quality)
 *  2. Fall back to browser speechSynthesis if network fails
 */

const TTS_URL = import.meta.env.VITE_EVENT_PROCESSOR_URL || "https://sentinel-5ytz.onrender.com";

const ANNOUNCEMENTS = {
  en: "Attention. Emergency alert. Please evacuate immediately using the nearest safe exit. Do not use elevators.",
  hi: "ध्यान दें। आपातकालीन चेतावनी। कृपया निकटतम सुरक्षित निकास का उपयोग करके तुरंत निकासी करें। लिफ्ट का उपयोग न करें।",
  ja: "注意。緊急警報。最寄りの安全な出口から直ちに避難してください。エレベーターは使用しないでください。",
  fr: "Attention. Alerte urgence. Veuillez évacuer immédiatement par la sortie de secours la plus proche. N'utilisez pas l'ascenseur.",
  es: "Atención. Alerta de emergencia. Por favor evacúen inmediatamente usando la salida de emergencia más cercana. No usen el ascensor.",
};

const LANG_BCP47 = { en: "en-US", hi: "hi-IN", ja: "ja-JP", fr: "fr-FR", es: "es-ES" };

async function speakWithCloudTTS(lang) {
  const res = await fetch(`${TTS_URL}/generate-announcement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: lang, safe_exit: "Staircase B", floor: 4 }),
    signal: AbortSignal.timeout(8000), // 8s timeout
  });
  if (!res.ok) throw new Error(`TTS server ${res.status}`);
  
  const { audio_url } = await res.json();
  
  return new Promise((resolve, reject) => {
    const audio = new Audio(audio_url);
    audio.onended  = resolve;
    audio.onerror  = reject;
    audio.play().catch(reject);
  });
}

function speakWithBrowserTTS(text, lang) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    window.speechSynthesis.cancel(); // clear queue
    const utterance   = new SpeechSynthesisUtterance(text);
    utterance.lang    = LANG_BCP47[lang] || "en-US";
    utterance.rate    = 0.9;
    utterance.onend   = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

export default function ZoneClearButton({ staffId, zone }) {
  const [clearing, setClearing] = useState(false);
  const [playing,  setPlaying]  = useState(null);
  const [ttsMode,  setTtsMode]  = useState("cloud"); // "cloud" | "browser"

  const handleClear = async () => {
    if (!staffId || !zone) return;
    setClearing(true);
    try {
      // 1. Update staff document
      await setDoc(doc(db, "staff", staffId), {
        zone_cleared:    true,
        zone_cleared_at: new Date().toISOString(),
        zone_assigned:   zone,
      }, { merge: true });

      // 2. Mark active incidents as RESOLVED
      const q = query(collection(db, "incidents"), where("status", "==", "ACTIVE"));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(incidentDoc => 
        updateDoc(doc(db, "incidents", incidentDoc.id), {
          status: "RESOLVED",
          resolved_at: new Date().toISOString()
        })
      );
      
      await Promise.all(updatePromises);
      
      console.log(`✅ Zone ${zone} marked as clear and all active incidents resolved.`);
      alert(`✅ Zone ${zone} marked as clear and incidents resolved.`);
    } catch (error) {
      console.error("Failed to mark zone clear:", error);
      alert("❌ Failed to mark zone clear. Check console for details.");
    } finally {
      setClearing(false);
    }
  };

  const playAnnouncement = async (lang) => {
    if (playing) return;
    setPlaying(lang);
    const text = ANNOUNCEMENTS[lang] || ANNOUNCEMENTS.en;

    try {
      await speakWithCloudTTS(lang);
      setTtsMode("cloud");
    } catch (err) {
      console.warn("☁️ Cloud TTS failed, using browser fallback:", err.message);
      setTtsMode("browser");
      await speakWithBrowserTTS(text, lang);
    } finally {
      setPlaying(null);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "0.75rem",
      padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px",
    }}>
      {/* TTS Mode Indicator */}
      <div style={{
        fontSize: "0.68rem", color: ttsMode === "cloud" ? "#22c55e" : "#f97316",
        display: "flex", alignItems: "center", gap: "0.4rem",
        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: ttsMode === "cloud" ? "#22c55e" : "#f97316",
          display: "inline-block",
        }} />
        {ttsMode === "cloud" ? "Cloud TTS Active" : "Browser TTS (fallback)"}
      </div>

      {/* Zone Clear Button */}
      <button
        id="zone-clear-btn"
        onClick={handleClear}
        disabled={clearing}
        style={{
          background: clearing ? "#555" : "#00C853", color: "white",
          border: "none", padding: "0.75rem 1.5rem", borderRadius: "6px",
          fontWeight: 600, cursor: clearing ? "not-allowed" : "pointer",
          transition: "all 0.2s", display: "flex",
          alignItems: "center", justifyContent: "center", gap: "0.5rem",
        }}
      >
        {clearing ? "⏳ Marking..." : "✅"} Mark Zone {zone} Clear
      </button>

      {/* Language Announcement Buttons */}
      <div>
        <p style={{
          fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Play Evacuation Announcement:
        </p>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {[
            { code: "en", label: "🇬🇧 EN" },
            { code: "hi", label: "🇮🇳 HI" },
            { code: "ja", label: "🇯🇵 JA" },
            { code: "fr", label: "🇫🇷 FR" },
            { code: "es", label: "🇪🇸 ES" },
          ].map(({ code, label }) => (
            <button
              key={code}
              id={`tts-btn-${code}`}
              onClick={() => playAnnouncement(code)}
              disabled={!!playing}
              style={{
                background: playing === code ? "#555" : "rgba(99,102,241,0.15)",
                color:      playing === code ? "#888" : "#6366f1",
                border:     `1px solid ${playing === code ? "#444" : "#6366f1"}`,
                padding: "0.35rem 0.75rem", borderRadius: "4px",
                fontWeight: 600, fontSize: "0.75rem",
                cursor: playing ? "not-allowed" : "pointer", transition: "all 0.2s",
              }}
            >
              {playing === code ? "🔊 Playing..." : `▶ ${label}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
