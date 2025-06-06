import os
import json
import argparse

from flask import Flask, jsonify, request, render_template, send_from_directory, abort

# ─── 1. Parse command-line arguments ────────────────────────────────────────────
parser = argparse.ArgumentParser(
    description="Run a Flask server for editing a font‐OCR mapping. "
    "You can specify where 'mapping.json' and glyph images live."
)

parser.add_argument(
    "-o",
    "--output-dir",
    default=os.path.join(os.path.dirname(__file__), "static", "output"),
    help=(
        "Directory that contains all glyph PNGs and 'mapping.json'. "
        "Each PNG should be named '<charcode>.png'. "
        "(Default: './output')"
    ),
)

parser.add_argument(
    "-H",
    "--host",
    default="0.0.0.0",
    help="Host IP to bind the Flask server to. (Default: 0.0.0.0)",
)

parser.add_argument(
    "-p",
    "--port",
    type=int,
    default=5000,
    help="Port to run the Flask server on. (Default: 5000)",
)

args = parser.parse_args()


# ─── 2. Configure paths based on args ───────────────────────────────────────────
OUTPUT_DIR = os.path.abspath(args.output_dir)
MAPPING_PATH = os.path.join(OUTPUT_DIR, "mapping.json")

# Make sure the directory exists (or create it if you prefer)
# If you want the server to fail fast when the folder is missing, you can omit this check.
if not os.path.isdir(OUTPUT_DIR):
    print(f"[ERROR] Specified output directory does not exist: {OUTPUT_DIR}")
    exit(1)

if not os.path.isfile(MAPPING_PATH):
    print(
        f"[WARNING] 'mapping.json' not found in {OUTPUT_DIR}. "
        f"You can still run the server, but GET /api/data will 404 until you place a valid JSON there."
    )
    # Note: we do NOT exit here; we simply warn. If you’d rather fail immediately, uncomment the next line:
    # exit(1)


# ─── 3. Create Flask app ───────────────────────────────────────────────────────
app = Flask(__name__)


@app.route("/")
def index():
    """
    Serves the HTML editor page.
    """
    return render_template("index.html")


@app.route("/api/data", methods=["GET"])
def get_mapping():
    """
    Returns the contents of mapping.json as JSON.
    """
    if not os.path.exists(MAPPING_PATH):
        return jsonify({"error": "'mapping.json' not found"}), 404

    with open(MAPPING_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)


@app.route("/api/save", methods=["POST"])
def save_mapping():
    """
    Accepts a JSON object payload like { "65": "A", "66": "B", ... }
    and overwrites mapping.json on disk.
    """
    try:
        updated = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON payload"}), 400

    if not isinstance(updated, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    try:
        with open(MAPPING_PATH, "w", encoding="utf-8") as f:
            json.dump(updated, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({"error": f"Unable to write mapping.json: {e}"}), 500

    return jsonify({"success": True})


@app.route("/glyphs/<int:charcode>.png")
def serve_glyph_png(charcode):
    """
    Serves the PNG for a given charcode from the specified OUTPUT_DIR.
    E.g. /glyphs/65.png → <OUTPUT_DIR>/65.png
    """
    filename = f"{charcode}.png"
    full_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(full_path):
        abort(404)
    return send_from_directory(OUTPUT_DIR, filename)


# ─── 4. Run the server ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[*] Starting Flask server with:")
    print(f"    • OUTPUT_DIR    = {OUTPUT_DIR}")
    print(f"    • mapping.json  = {MAPPING_PATH}")
    print(f"    • Bind address  = {args.host}:{args.port}\n")
    app.run(host=args.host, port=args.port, debug=True)
