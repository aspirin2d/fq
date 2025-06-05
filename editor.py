from flask import Flask, jsonify, request, render_template, send_from_directory, abort
import os
import json

app = Flask(__name__)

# Assume mapping.json and PNGs live under output/
OUTPUT_DIR = os.path.join(app.root_path, "output")
MAPPING_PATH = os.path.join(OUTPUT_DIR, "mapping.json")


@app.route("/")
def index():
    # Renders the main HTML page (index.html)
    return render_template("index.html")


@app.route("/api/data", methods=["GET"])
def get_mapping():
    """
    Returns the entire mapping.json as JSON.
    """
    if not os.path.exists(MAPPING_PATH):
        return jsonify({"error": "mapping.json not found"}), 404

    with open(MAPPING_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)


@app.route("/api/save", methods=["POST"])
def save_mapping():
    """
    Accepts a JSON payload in the format: { "65": "A", "66": "B", ... }
    Overwrites mapping.json on disk. Returns success or error.
    """
    try:
        updated = request.get_json(force=True)  # Expecting JSON body
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not isinstance(updated, dict):
        return jsonify({"error": "Payload must be a JSON object"}), 400

    # Optionally, you could validate that every key is a string of digits:
    # for key in updated:
    #     if not key.isdigit():
    #         return jsonify({"error": f"Invalid charcode: {key}"}), 400

    try:
        with open(MAPPING_PATH, "w", encoding="utf-8") as f:
            json.dump(updated, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({"error": f"Unable to write mapping.json: {e}"}), 500

    return jsonify({"success": True})


@app.route("/glyphs/<int:charcode>.png")
def serve_glyph_png(charcode):
    """
    Serves an individual PNG by its charcode filename. 
    For example: /glyphs/65.png → static/output/65.png
    """
    filename = f"{charcode}.png"
    full_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(full_path):
        abort(404)
    # 'static/output' is the directory; we just send the file if it exists
    return send_from_directory(OUTPUT_DIR, filename)


if __name__ == "__main__":
    # Listen on all interfaces, port 5000 by default
    app.run(host="0.0.0.0", port=8088, debug=True)
