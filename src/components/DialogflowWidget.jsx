import { useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * SENTINEL Phase 2 — Voice Hub (Dialogflow Messenger)
 * Final Version for Phase 3 Submission.
 */
export default function DialogflowWidget({ inline = false }) {
  
  const handleUserMessage = async (event) => {
    // 🎤 Extract message text
    const text = event.detail.message.text.toLowerCase();
    console.log("🎤 SENTINEL Voice Hub received:", text);

    // 🕵️ Extract Logic for Demo Support
    let type = "FIRE";
    if (text.includes("smoke")) type = "SMOKE";
    if (text.includes("trapped")) type = "TRAPPED";
    if (text.includes("medical")) type = "MEDICAL";

    // Detect Floor (handles "floor 2", "floor-2", "floor 4", etc.)
    const floorMatch = text.match(/\d+/);
    const floorNum = floorMatch ? floorMatch[0] : "4";
    const nodeId = floorNum === "2" ? "MT-2-EastHall" : `MT-${floorNum}-EastHall`;

    try {
      await addDoc(collection(db, "incidents"), {
        event_id: `v-${Date.now()}`,
        incident_id: `inc-${Date.now()}`,
        event_type: type,
        location: {
          floor: `MT-${floorNum}`,
          zone: "EastHall",
          room: "Voice Report",
          nodeId: nodeId
        },
        confidence: 0.95,
        source_type: "VOICE_DIALOGFLOW",
        status: "ACTIVE",
        timestamp: new Date().toISOString(),
        created_at: serverTimestamp()
      });
      console.log(`✅ Demo Sync: Recorded ${type} on Floor ${floorNum}`);
    } catch (e) {
      console.error("Voice Sync Error:", e);
    }
  };

  useEffect(() => {
    // 1. Google Dialogflow Bootstrapper
    if (!document.getElementById("df-messenger-script")) {
      const script = document.createElement("script");
      script.id = "df-messenger-script";
      script.src = "https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1";
      script.async = true;
      document.body.appendChild(script);
    }

    // 2. Event Listener for the Chat
    window.addEventListener('df-messenger-user-message', handleUserMessage);

    return () => {
      window.removeEventListener('df-messenger-user-message', handleUserMessage);
    };
  }, []);

  const containerStyle = inline 
    ? { position: "relative", width: "100%", height: "200px", overflow: "hidden" }
    : { position: "fixed", bottom: "30px", right: "30px", zIndex: 2000 };

  return (
    <div style={containerStyle}>
       <df-messenger
        location="global"
        project-id={import.meta.env.VITE_DIALOGFLOW_PROJECT_ID || "sentinel-494020"}
        agent-id={import.meta.env.VITE_DIALOGFLOW_AGENT_ID || "282d5d70-fce9-4da7-bd24-8d7fbb420f21"}
        language-code="en"
        chat-title="SENTINEL EMERGENCY VOICE"
        wait-open="false"
        expand="false"
        allow-mic="true"
      ></df-messenger>
      
      <style>{`
        df-messenger {
          --df-messenger-button-titlebar-color: #ef4444;
          --df-messenger-send-icon: #ef4444;
          --df-messenger-chat-background: #0f172a;
          --df-messenger-input-box-color: #1e293b;
          --df-messenger-font-color: white;
          --df-messenger-user-message: #334155;
          --df-messenger-box-border-radius: 4px;
          --df-messenger-focus-color: #ef4444;
          ${inline ? 'height: 100% !important; --df-messenger-chat-window-height: 200px;' : ''}
        }
        ${inline ? 'df-messenger-button { display: none !important; }' : ''}
      `}</style>
    </div>
  );
}
