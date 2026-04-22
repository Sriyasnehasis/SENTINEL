import json
import os
import sys
import time
from unittest.mock import MagicMock

# Add function directories to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'gemini-trigger')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'fcm-dispatcher')))

# Mock functions_framework and GCP clients before importing main
sys.modules['functions_framework'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.messaging'] = MagicMock()

# Use importlib for modules with hyphens
import importlib.util

def import_module_from_path(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

gemini_main = import_module_from_path("gemini_main", os.path.join(os.path.dirname(__file__), "gemini-trigger", "main.py"))
fcm_main = import_module_from_path("fcm_main", os.path.join(os.path.dirname(__file__), "fcm-dispatcher", "main.py"))

def test_gemini_logic():
    print("\n--- Testing Gemini SitRep Generation ---")
    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY environment variable not set.")
        return

    # Mock CloudEvent for Firestore Create
    mock_event = MagicMock()
    mock_event.data = {
        "value": {
            "fields": {
                "event_type": {"stringValue": "FIRE"},
                "location": {
                    "mapValue": {
                        "fields": {
                            "floor": {"integerValue": 4},
                            "zone": {"stringValue": "East Wing"},
                            "room": {"stringValue": "412"}
                        }
                    }
                }
            }
        }
    }

    print(" Triggering on_incident_created simulation...")
    try:
        # Note: This will attempt to talk to real Firestore if not mocked
        # For a local unit test, we'd mock the Firestore client
        gemini_main.on_incident_created(mock_event)
        print(" Simulation triggered. Check Firestore /sessions/current for results.")
    except Exception as e:
        print(f"Gemini Simulation failed: {e}")

def test_fcm_logic():
    print("\n--- Testing FCM Dispatch Logic ---")
    
    # Mock CloudEvent for Firestore Write to sessions/current
    mock_event = MagicMock()
    mock_event.data = {
        "value": {
            "fields": {
                "current_sitrep": {
                    "mapValue": {
                        "fields": {
                            "severity": {"stringValue": "P0"},
                            "threat_summary": {"stringValue": "Major fire on floor 4"}
                        }
                    }
                }
            }
        }
    }

    print(" Triggering on_p0_incident simulation...")
    try:
        fcm_main.on_p0_incident(mock_event)
        print(" Simulation triggered. Check logs for FCM success/failure.")
    except Exception as e:
        print(f" FCM Simulation failed: {e}")

if __name__ == "__main__":
    print("SENTINEL Phase 3  Local Function Test Suite")
    print("============================================")
    
    # Load .env if exists (simple parser)
    if os.path.exists("../../.env"):
        with open("../../.env") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v
                    if k == "VITE_GEMINI_API_KEY" and not os.environ.get("GEMINI_API_KEY"):
                        os.environ["GEMINI_API_KEY"] = v

    test_gemini_logic()
    # Wait a bit between calls if needed
    test_fcm_logic()
