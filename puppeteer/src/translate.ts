import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { z } from 'zod';
import path from 'path';
import { zodTextFormat } from "openai/helpers/zod";
import OpenAI from 'openai';
import 'dotenv/config'

import type { ChapterInfo } from './info.js';

const program = new Command();
program
  .requiredOption('-i, --input <file>', 'JSON file to translate')
  .requiredOption('-l, --language <lang>', 'Target language')
  .option('-o, --output <dir>', 'Output folder', 'output')
  .option('-k, --api-key <key>', 'OpenAI API key', process.env.OPENAI_API_KEY)
  .option('-m, --model <model>', 'OpenAI model', 'gpt-4.1')
  .parse(process.argv);

const opts = program.opts();

async function translateText(openai: OpenAI, chapter: ChapterInfo, lang: string, model: string) {
  const resp = await openai.responses.parse({
    model,
    input: `You are a professional literary translator. Translate the following chapters's title and content into ${lang}  while preserving the tone, style, and meaning of the original text. Make the dialogue feel natural in the target language, and keep the formatting (paragraphs, dialogues, narration) clear and consistent.\n\`\`\`\njson\n${JSON.stringify(chapter)}\n\`\`\``,
    text: {
      format: zodTextFormat(z.object({ title: z.string(), content: z.array(z.string()) }), "translate")
    }
  });
  return resp.output_parsed
}

(async () => {
  if (!opts.apiKey) {
    throw new Error('OpenAI API key not provided');
  }
  const buf = await readFile(opts.input, 'utf8');
  const data = JSON.parse(buf);

  const chapters = data.chapters as ChapterInfo[];
  if (!chapters) {
    throw new Error('Invalid input JSON structure');
  }

  const openai = new OpenAI({ apiKey: opts.apiKey });

  for (const ch of chapters) {
    if (!ch.content || ch.content.length === 0) continue;
    console.log(`Translating chapter: ${ch.title}`);
    const translated = await translateText(openai, ch, opts.language, opts.model);
    if (translated) {
      console.log('translated: ', translated.title)
      ch.content = translated.content;
      ch.title = translated.title;
    }
  }

  const outDir = opts.output;
  await mkdir(outDir, { recursive: true });
  const base = path.basename(opts.input, '.json');
  const outPath = path.join(outDir, `${base}.${opts.language}.json`);
  await writeFile(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Translated JSON saved to ${outPath}`);
})();
