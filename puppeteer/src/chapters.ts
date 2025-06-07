import type { Browser } from "puppeteer-core";
import type { Info } from "./info.js";
import mapping from "../mapping.json" with { type: "json" }

import { setTimeout } from "node:timers/promises";

interface ChapterUpdate {
  words: number;
  updatedAt: Date;
}

export function parseChapterUpdate(line: string): ChapterUpdate | undefined {
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
    updatedAt: new Date(year, month - 1, day)
  };
}

function parseContent(content: string[]) {
  return content.map(str => {
    const decoded = [...str].map(ch => {
      const code = ch.codePointAt(0);
      if (code) {
        const codex = mapping.codes.find(item => item.key === code.toString())
        if (codex) return codex.value
        return ch
      }
    })

    return decoded.join("")
  })
}

export async function getChapters(browser: Browser, info: Info) {
  const chapters = info.chapters.filter(ch => ch.isLocked === false)

  const res = []
  for (const ch of chapters) {
    const page = await browser.newPage();
    await page.goto(ch.href, { waitUntil: "domcontentloaded" })

    const titleHandle = await page.waitForSelector(".muye-reader-title")
    const title: string = await titleHandle?.evaluate(el => el.textContent) || ""

    const subtitleHandle = await page.waitForSelector(".muye-reader-subtitle")
    const subtitle = await subtitleHandle?.evaluate(el => el.textContent)

    const update = parseChapterUpdate(subtitle)
    console.log("Processing:", title)

    await page.waitForSelector(".muye-reader-content")
    const content = await page.$$eval(
      ".muye-reader-content div p",
      ps => ps.map(p => p.textContent.trim())
    )
    const parsed = parseContent(content)
    res.push({
      title,
      update,
      content: parsed,
    })
  }

  return res
}
