import type { Browser } from "puppeteer-core";

export type ChapterInfo = {
  title: string,
  href: string,
  isLocked: boolean
}

export type Info = {
  name: string,
  abstractContent: string,
  chapters: ChapterInfo[]
}

export async function getInfo(browser: Browser, url: string): Promise<Info> {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" })

  const nameHandle = await page.waitForSelector('.info-name h1');
  const name = await nameHandle?.evaluate(el => el.textContent) || "Unkown title"

  const abstractContentHandle = await page.waitForSelector('.page-abstract-content p');
  const abstractContent = await abstractContentHandle?.evaluate(el => el.textContent)

  await page.waitForSelector('.chapter');
  const chapters = await page.$$eval('.chapter-item', items =>
    items.map(item => {
      const linkEl = item.querySelector('a.chapter-item-title');
      const lockEl = item.querySelector('span.chapter-item-lock');
      return {
        title: linkEl?.textContent.trim() ?? '',
        href: linkEl?.href ?? '',
        isLocked: lockEl !== null          // true if <span class="chapter-item-lock"> exists
      };
    })
  );

  return {
    name,
    abstractContent,
    chapters
  }
}
