// src/index.ts
import { Command } from 'commander';
import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { getInfo } from './info.js';
import { getChapters } from './chapters.js';

const program = new Command();

program
  .requiredOption('-u, --url <string>', 'The novel URL to scrape')
  .option('-c, --chrome-path <path>', 'Path to Chrome executable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  .option('-o, --output <dir>', 'Output folder', 'output')
  .parse(process.argv);

const opts = program.opts();

async function saveJsonTo(obj: any, dirPath: string, fileName: string) {
  await mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, fileName);
  await writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
  console.log(`✅ JSON saved to ${filePath}`);
}

; (async () => {
  const browser = await puppeteer.launch({
    executablePath: opts.chromePath,
    headless: true,
    defaultViewport: { width: 1024, height: 1600 },
  });

  const info = await getInfo(browser, opts.url);
  const chapters = await getChapters(browser, info);

  const result = { info, chapters, updateAt: new Date().toISOString() };
  await saveJsonTo(result, opts.output, `${info.name}.json`);

  await browser.close();
})();
