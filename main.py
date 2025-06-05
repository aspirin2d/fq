#!/usr/bin/env python3
import os
import json
import argparse

from fontTools.ttLib import woff2
import freetype
from PIL import Image
from paddleocr import PaddleOCR

def parse_args():
    parser = argparse.ArgumentParser(
        description="Decompress a WOFF2 font, rasterize glyphs to fixed-size PNGs, "
                    "run OCR on each, and dump a JSON mapping from Unicode code point → recognized text."
    )

    parser.add_argument(
        "-i", "--input-font",
        required=True,
        help="Path to the input .woff2 font file."
    )
    parser.add_argument(
        "-o", "--output-dir",
        default="output",
        help="Directory where glyph PNGs will be saved. (Default: output)"
    )
    parser.add_argument(
        "-m", "--mapping-json",
        default="mapping.json",
        help="Filename (or path) for the output JSON mapping. (Default: mapping.json)"
    )

    parser.add_argument(
        "--width",
        type=int,
        default=128,
        help="Width (in pixels) of each fixed-size output canvas. (Default: 128)"
    )
    parser.add_argument(
        "--height",
        type=int,
        default=128,
        help="Height (in pixels) of each fixed-size output canvas. (Default: 128)"
    )
    parser.add_argument(
        "--font-size",
        type=int,
        default=72 * 96,
        help="Font size in FreeType’s 1/64th points units (e.g. 72*96 = 6912). (Default: 6912)"
    )
    parser.add_argument(
        "--max-count",
        type=int,
        default=0,
        help="Maximum number of glyphs to process. Use 0 for no limit. (Default: 0)"
    )

    parser.add_argument(
        "--skip-empty",
        action="store_true",
        help="If set, skip writing entries for blank glyphs entirely instead of writing \"\"."
    )

    return parser.parse_args()


def main():
    args = parse_args()

    # Ensure output directory exists
    os.makedirs(args.output_dir, exist_ok=True)

    # Step 1: Decompress WOFF2 → TTF
    decompressed_ttf = os.path.join(args.output_dir, os.path.splitext(args.input_font)[0] + ".ttf")
    print(f"[INFO] Decompressing '{args.input_font}' → '{decompressed_ttf}'")
    woff2.decompress(args.input_font, decompressed_ttf)

    # Step 2: Load the TTF font at the requested size
    face = freetype.Face(decompressed_ttf)
    face.set_char_size(args.font_size)

    # Step 3: Initialize PaddleOCR once
    ocr = PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_detection_model_name="PP-OCRv5_server_det",
        text_recognition_model_name="PP-OCRv5_server_rec",
    )

    # Step 4: Iterate over every (charcode, glyph_index) pair
    charcode_to_text = {}
    char_map = face.get_chars()  # list of (charcode, glyph_index) pairs

    processed = 0

    for charcode, glyph_index in char_map:
        # Step 4.1: Load & render the glyph into a grayscale bitmap
        face.load_char(chr(charcode), freetype.FT_LOAD_RENDER)
        bitmap = face.glyph.bitmap
        width, rows = bitmap.width, bitmap.rows

        # If this glyph is blank (no pixels)
        if width == 0 or rows == 0:
            if not args.skip_empty:
                charcode_to_text[charcode] = ""
            # Continue to next glyph
            continue

        # Convert the FreeType buffer into a bytes object
        raw_buffer = bytes(bitmap.buffer)

        # Build a small "mask" image from the glyph data (mode "L" = 8-bit grayscale)
        glyph_mask = Image.frombytes("L", (width, rows), raw_buffer)

        # Create a fixed-size white canvas
        canvas = Image.new("L", (args.width, args.height), 255)

        # Compute offsets to center the glyph in the canvas
        offset_x = (args.width - width) // 2
        offset_y = (args.height - rows) // 2

        # Paste black (0) through the glyph_mask onto the white canvas
        canvas.paste(0, (offset_x, offset_y), mask=glyph_mask)

        # Save to disk as PNG
        out_path = os.path.join(args.output_dir, f"{charcode}.png")
        canvas.save(out_path)

        # Run OCR on the saved PNG
        ocr_result = ocr.predict(out_path)
        for line in ocr_result:
            res = line.json;
            rect_texts = res.get("res").get("rec_texts")
            if rect_texts:
                charcode_to_text[charcode]  = rect_texts[0]
                print(f"{charcode} - {rect_texts[0]}")

        processed += 1
        print(f"[{processed}] → (saved: {out_path})")

        # If user specified a max-count, stop when reached
        if args.max_count and processed >= args.max_count:
            break

    # Step 5: Dump the mapping to a JSON file
    serializable = {
        f"{code}": text for code, text in charcode_to_text.items()
    }
    mapping_path = os.path.join(args.output_dir, args.mapping_json)
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(serializable, f, ensure_ascii=False, indent=2)

    print(f"\n[INFO] Mapping saved to: {args.mapping_json}")


if __name__ == "__main__":
    main()
