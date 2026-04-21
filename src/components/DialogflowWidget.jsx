import { useEffect } from "react";

/**
 * DialogflowWidget — Embeds Google Dialogflow CX Messenger
 *
 * NOTE: AGENT_ID is a placeholder. The widget will show a 404 until
 * replaced with a real Dialogflow CX agent ID.
 * Set AGENT_ID = null to fully disable the widget.
 */

const AGENT_ID = null; // Replace with real agent ID, e.g. "abc123-...-def"
const SCRIPT_ID = "dialogflow-bootstrap-script";

export default function DialogflowWidget() {
  useEffect(() => {
    // Skip entirely if no agent configured
    if (!AGENT_ID) return;

    // Prevent duplicate script injection (survives HMR)
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=4";
    script.async = true;
    document.body.appendChild(script);

    // No cleanup — removing the script does NOT un-register the custom element
    // and re-injecting it causes the NotSupportedError. Leave it in the DOM.
  }, []);

  // Render nothing when no agent is configured
  if (!AGENT_ID) return null;

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
        zIndex: 9999,
      }}
    />
  );
}
