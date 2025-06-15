// src/index.ts
import { Command } from 'commander';
import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { getInfo } from './info.js';
import { readChapters } from './chapters.js';
import { Page } from "puppeteer-core"

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

(async () => {
  const browser = await puppeteer.launch({
    executablePath: opts.chromePath,
    headless: true,
    defaultViewport: { width: 1024, height: 1600 },
  });

  const page = await browser.newPage();
  await page.goto(opts.url);

  const hrefs = await page.$$eval("a", as =>
    as
      .map(a => a.getAttribute("href") || "")
      .filter(href => /^\/page\/\d+$/.test(href))
  );

  const result = []
  for await (const href of hrefs) {
    const absUrl = "https://fanqienovel.com" + href
    const info = await getInfo(browser, absUrl)
    result.push({
      ...info,
      url: absUrl
    })
  }

  saveJsonTo(result, opts.output, "page-links-" + new Date().getTime() + ".json")

  await browser.close();
})();
