#!/usr/bin/env python3
import os
import json
import logging
from datetime import datetime

from flask import Flask, request, make_response
from slack_sdk.web import WebClient
from slack_sdk.signature import SignatureVerifier

# ─── Configuration ────────────────────────────────────────────────────────────

# Make sure to set these in your environment before running:
SLACK_BOT_TOKEN       = os.environ.get("SLACK_BOT_TOKEN")
SLACK_SIGNING_SECRET  = os.environ.get("SLACK_SIGNING_SECRET")
LOG_FILE              = os.environ.get("SLACK_LOG_FILE", "slack_events.jsonl")
PORT                  = int(os.environ.get("PORT", 3000))

if not SLACK_BOT_TOKEN or not SLACK_SIGNING_SECRET:
    raise RuntimeError("SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET must be set")

# ─── App & Clients ─────────────────────────────────────────────────────────────

app      = Flask(__name__)
client   = WebClient(token=SLACK_BOT_TOKEN)
verifier = SignatureVerifier(signing_secret=SLACK_SIGNING_SECRET)

# ─── Helpers ───────────────────────────────────────────────────────────────────

def log_event(record: dict):
    """Append a JSON record to the log file."""
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

# ─── Routes ────────────────────────────────────────────────────────────────────

@app.route("/slack/events", methods=["POST"])
def slack_events():
    # 1) Verify request signature
    if not verifier.is_valid_request(request.get_data(), request.headers):
        return make_response("Invalid signature", 403)

    data = request.get_json()

    # 2) Handle URL verification challenge
    if data.get("type") == "url_verification":
        return make_response(data.get("challenge"), 200, {"content_type": "text/plain"})

    # 3) Handle event callbacks
    if data.get("type") == "event_callback":
        ev = data["event"]
        record = {
            "received_at":     datetime.utcnow().isoformat() + "Z",
            "slack_event_ts":  ev.get("ts"),
            "event_type":      ev.get("type"),
            "user":            ev.get("user"),
            "channel":         ev.get("channel"),
            "text":            ev.get("text"),
            "raw_payload":     ev
        }
        try:
            log_event(record)
            logging.info(f"Logged event {record['event_type']} from {record['user']}")
        except Exception as e:
            logging.error(f"Failed to log event: {e}")

    return make_response("", 200)

# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    logging.info(f"Starting Slack event collector on port {PORT}")
    app.run(host="0.0.0.0", port=PORT)
