import puppeteer from "puppeteer-core"
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { getInfo } from "./info.js";
import { getChapters } from "./chapters.js";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const OUTPUT_PATH = "output"

const FQ_URL = 'https://fanqienovel.com/page/7143038691944959011';

// ES module style (Node.js 14+)
async function saveJsonTo(obj: any, dirPath: string, fileName: string) {
  try {
    // 1. Ensure the directory exists (creates nested folders if needed)
    await mkdir(dirPath, { recursive: true });

    // 2. Build the full path
    const filePath = path.join(dirPath, fileName);

    // 3. Serialize and write
    const json = JSON.stringify(obj, null, 2);
    await writeFile(filePath, json, 'utf8');

    console.log(`✅ JSON saved to ${filePath}`);
  } catch (err) {
    console.error(`❌ Failed to save JSON:`, err);
    throw err;
  }
}


const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  // portrait view port
  defaultViewport: {
    width: 1024,
    height: 1600,
  }
})

const info = await getInfo(browser, FQ_URL)
const chapters = await getChapters(browser, info)

const res = { info, chapters, updateAt: new Date() }
await saveJsonTo(res, OUTPUT_PATH, info.name + ".json")

browser.close();
