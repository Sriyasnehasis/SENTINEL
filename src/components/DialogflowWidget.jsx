import { useEffect } from "react";

/**
 * DialogflowWidget — Embeds Google Dialogflow CX Messenger
 * Allows users to report emergencies via voice/text chat
 * 
 * Setup: Create Dialogflow CX agent and replace AGENT_ID below
 */
export default function DialogflowWidget() {
  // Replace with your actual Dialogflow CX Agent ID
  const AGENT_ID = "YOUR_DIALOGFLOW_CX_AGENT_ID";

  useEffect(() => {
    // Load Dialogflow Messenger script
    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <df-messenger
      intent="WELCOME"
      chat-title="SENTINEL Voice Report"
      agent-id={AGENT_ID}
      language-code="en"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999
      }}
    />
  );
}
