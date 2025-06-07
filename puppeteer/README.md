# FQ Scraper

A simple Puppeteer-based CLI tool to scrape novel metadata and chapter content from FQ novel.

## Features

* Fetch novel info: title, abstract, list of chapters (with `isLocked` flag).
* Parse chapter metadata: word count and update date (handles missing year by defaulting to current year).
* Decode obfuscated characters via a `mapping.json` file.
* Save full novel data (info + chapters) into a JSON file.

## Prerequisites

* **Node.js** v22 or higher
* **npm** (comes with Node.js) or **pnpm**
* A local installation of **Google Chrome** (or Chromium)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/aspirin2d/fq.git
   cd fq
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Ensure you have a valid `mapping.json`**

   The scraper expects a `mapping.json` in the project root with the following shape:

   ```json
   {
     "codes": [
       { "key": "12345", "value": "你" },
       { "key": "67890", "value": "好" },
       ...
     ]
   }
   ```

## Usage

Compile (if needed) and run the CLI:

```bash
# With ts-node (no build step)
pnpm run dev \
  --url "https://fanqienovel.com/page/<NOVEL-ID>" \
  --chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --output "output"

# Or, after building to JavaScript
npm run dev \
  --url "https://fanqienovel.com/page/<NOVEL-ID>" \
  --chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --output "output"
```

### Options

* `-u, --url <string>` (required)
  The novel’s main page URL to scrape.

* `-c, --chrome-path <path>`
  Path to your Chrome/Chromium executable.
  *Default:* `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

* `-o, --output <dir>`
  Directory to write the resulting JSON file.
  *Default:* `output`

## Output

On successful run, you'll find:

```
output/
└── <Novel Name>.json
```

The JSON structure:

```json
{
  "info": {
    "name": "Novel Title",
    "abstractContent": "Short synopsis...",
    "chapters": [
      { "title": "Chapter 1", "href": "...", "isLocked": false },
      ...
    ]
  },
  "chapters": [
    {
      "title": "Chapter 1",
      "update": { "words": 1234, "updatedAt": "2025-06-07T00:00:00.000Z" },
      "content": [
        "第一段文本...",
        "第二段文本...",
        ...
      ]
    },
    ...
  ],
  "updateAt": "2025-06-07T14:00:00.000Z"
}
```

## Configuration & Customization

* **`parseChapterUpdate`**: Regex in `chapters.ts` can be adjusted to match different date formats or locales.
* **`mapping.json`**: Customize character mappings to decode obfuscated text.
* **Concurrency**: For large novels, consider parallelizing `getChapters` with a concurrency limit and adding rate‑limiting delays.

## Error Handling

* The scraper throws if selectors change or time out. Adjust timeout values in `waitForSelector` calls or wrap in `try/catch` for resilience.
* Ensure Chrome path is correct; if Puppeteer can’t launch, you’ll see an executable error.

## Development

* **Build**: `npm run build` (compiles TypeScript to `dist/`)
* **Development**: `npm run dev`

## License

MIT © aspirin2d
