import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import 'dotenv/config'

import type { ChapterInfo, Info } from './info.js';

interface Data extends Info { updateAt?: string; }

const program = new Command();
program
  .requiredOption('-i, --input <file>', 'JSON file to translate')
  .requiredOption('-l, --language <lang>', 'Target language')
  .option('-o, --output <dir>', 'Output folder', 'output')
  .option('-k, --api-key <key>', 'OpenAI API key', process.env.OPENAI_API_KEY)
  .option('-m, --model <model>', 'OpenAI model', 'gpt-4o')
  .parse(process.argv);

const opts = program.opts();

async function translateText(openai: OpenAI, text: string, lang: string, model: string): Promise<string> {
  const resp = await openai.responses.create({
    model,
    input: `Translate the following text into ${lang}:\n${text}`
  });
  return resp.output_text
}

(async () => {
  if (!opts.apiKey) {
    throw new Error('OpenAI API key not provided');
  }
  const buf = await readFile(opts.input, 'utf8');
  const data: Data | { info: Info; chapters: ChapterInfo[]; updateAt?: string } = JSON.parse(buf);

  const chapters: ChapterInfo[] = Array.isArray((data as Data).chapters)
    ? (data as Data).chapters
    : (data as any).info?.chapters;
  if (!chapters) {
    throw new Error('Invalid input JSON structure');
  }

  const openai = new OpenAI({ apiKey: opts.apiKey });

  for (const ch of chapters) {
    if (!ch.content || ch.content.length === 0) continue;
    console.log(`Translating chapter: ${ch.title}`);
    const text = ch.content.join('\n');
    const translated = await translateText(openai, text, opts.language, opts.model);
    ch.content = translated.split('\n').map(s => s.trim());
  }

  const outDir = opts.output;
  await mkdir(outDir, { recursive: true });
  const base = path.basename(opts.input, '.json');
  const outPath = path.join(outDir, `${base}.${opts.language}.json`);
  await writeFile(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Translated JSON saved to ${outPath}`);
})();
