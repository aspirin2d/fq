# FontTools OCR Pipeline

A Python toolkit to extract character mappings from obfuscated web fonts and edit them through a small Flask interface.

## Features

* Decompresses WOFF2 fonts to TTF.
* Rasterizes each glyph into a PNG image.
* Runs PaddleOCR to recognize characters.
* Saves results to `mapping.json`.
* Provides a browser-based editor to tweak the mapping.

## Prerequisites

* Python 3.10+
* `pip` for installing the dependencies listed in `requirements.txt`

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/aspirin2d/fq.git
   cd fq/fonttools
   ```

2. **Create a virtual environment and install dependencies**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

## Usage

### 1. Run OCR on a font

```bash
python ocr.py -i example.woff2 -o output
```

This generates PNG glyphs and writes a `mapping.json` inside the `output/` directory.

### 2. Edit the mapping in your browser

```bash
python editor.py -o output
```

Open `http://localhost:5000` to view and modify the recognized text. Click **Save All Changes** to update `mapping.json`.

### Options

* `-i, --input-font <path>` – path to the source `.woff2` font.
* `-o, --output-dir <dir>` – where PNGs and `mapping.json` are stored. Default: `output/`.
* `-m, --mapping-json <file>` – filename for the mapping JSON. Default: `mapping.json`.

### Example `mapping.json`

```json
{
  "fontName": "example.woff2",
  "updatedAt": "2025-06-07T12:34:56.000Z",
  "codes": [
    { "key": "65", "value": "A" },
    { "key": "66", "value": "B" }
  ]
}
```

## Development

* Type checking with `pyright`.
* HTML templates live in `templates/`.

## License

MIT © aspirin2d

