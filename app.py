#!/usr/bin/env python3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import threading
import time
import logging

app = Flask(__name__, static_folder='static')
CORS(app)  # allow requests from your frontend

# ------------------------------
# System State (simulated)
# ------------------------------
state = {
    "esp_awake": True,
    "radio_signal": "OK",
    "pump": False,
    "solenoids": [False, False, False, False],
    "manual_control": False   # mirror frontend state
}

# Lock to prevent race conditions
state_lock = threading.Lock()

# ------------------------------
# Simulated LoRa "send" function
# ------------------------------
def lora_send(command):
    """
    Simulate sending a command to ESP32 via LoRa.
    Replace this with actual serial/LoRa library calls later.
    """
    logging.info(f"[LORA SEND] {command}")
    # In real hardware, you would write to serial or LoRa module here.

# ------------------------------
# API Endpoints
# ------------------------------
@app.route('/')
def serve_index():
    """Serve the main HTML page."""
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS)."""
    return send_from_directory('static', path)

@app.route('/api/status', methods=['GET'])
def get_status():
    """Return current system state."""
    with state_lock:
        return jsonify({
            "esp_awake": state["esp_awake"],
            "radio_signal": state["radio_signal"],
            "pump": state["pump"],
            "solenoids": state["solenoids"],
            "manual_control": state["manual_control"]
        })

@app.route('/api/control', methods=['POST'])
def control():
    """Receive commands from frontend."""
    data = request.json
    cmd = data.get('command')
    with state_lock:
        if cmd == 'pump_toggle':
            new_state = not state["pump"]
            state["pump"] = new_state
            lora_send(f"PUMP {'ON' if new_state else 'OFF'}")
        elif cmd == 'solenoid_toggle':
            idx = data.get('index')
            if 0 <= idx < 4:
                # Only one solenoid active at a time (enforced by frontend)
                for i in range(4):
                    state["solenoids"][i] = (i == idx and not state["solenoids"][i])
                lora_send(f"SOLENOID {idx+1} {'ON' if state['solenoids'][idx] else 'OFF'}")
        elif cmd == 'esp_sleep':
            state["esp_awake"] = False
            state["radio_signal"] = "NO SIGNAL"
            state["manual_control"] = False
            lora_send("ESP_SLEEP")
        elif cmd == 'esp_wake':
            state["esp_awake"] = True
            state["radio_signal"] = "OK"
            lora_send("ESP_WAKE")
        elif cmd == 'manual_control':
            state["manual_control"] = data.get('enabled', False)
            # When manual control disabled, turn everything off
            if not state["manual_control"]:
                state["pump"] = False
                state["solenoids"] = [False, False, False, False]
                lora_send("ALL_OFF")
        else:
            return jsonify({"error": "unknown command"}), 400
    return jsonify({"status": "ok"})

# ------------------------------
# Run the server
# ------------------------------
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    app.run(host='127.0.0.1', port=5000, threaded=True)
