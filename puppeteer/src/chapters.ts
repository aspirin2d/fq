import type { Browser } from "puppeteer-core";
import type { Info, UpdateInfo } from "./info.js";
import mapping from "../mapping.json" with { type: "json" }

import { setTimeout } from "node:timers/promises";

export function parseChapterUpdate(line: string): UpdateInfo | undefined {
  const regex = /^本章字数：(?<words>\d+)字更新时间：(?:(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})|(?<mNoYear>\d{2})-(?<dNoYear>\d{2}))$/;
  const match = line.match(regex);
  if (!match || !match.groups) return undefined;

  const groups = match.groups;
  const currentYear = new Date().getFullYear();

  const words = Number(groups.words);
  const year = groups.year ? Number(groups.year) : currentYear;
  const month = groups.month ? Number(groups.month) : Number(groups.mNoYear);
  const day = groups.day ? Number(groups.day) : Number(groups.dNoYear);

  return {
    words,
    updatedAt: new Date(year, month - 1, day).toISOString()
  };
}

const codeMap = new Map(mapping.codes.map(c => [c.key, c.value]));

function parseContent(content: string[]) {
  return content.map(str => {
    return [...str].map(ch => codeMap.get(ch.codePointAt(0)?.toString() ?? "") ?? ch).join("");
  })
}

export async function readChapters(browser: Browser, info: Info) {
  const chapters = info.chapters.filter(ch => ch.isLocked === false)

  for (const ch of chapters) {
    const page = await browser.newPage();
    await page.goto(ch.href, { waitUntil: "domcontentloaded" })

    const titleHandle = await page.waitForSelector(".muye-reader-title")
    const title: string = await titleHandle?.evaluate(el => el.textContent) || ""

    console.log("Processing chapter:", title)

    let subtitle: string | undefined;
    try {
      const subtitleHandle = await page.waitForSelector(".muye-reader-subtitle", { timeout: 3000 })
      subtitle = await subtitleHandle?.evaluate(el => el.textContent)
    } catch (e) {
      console.warn("Subtitle Not Found")
    }

    await page.waitForSelector(".muye-reader-content")
    const content = await page.$$eval(
      ".muye-reader-content div p",
      ps => ps.map(p => p.textContent.trim())
    )
    const parsed = parseContent(content)
    ch.content = parsed;
    ch.update = subtitle ? parseChapterUpdate(subtitle) : undefined
    await setTimeout(1000);
    await page.close();
  }
}
