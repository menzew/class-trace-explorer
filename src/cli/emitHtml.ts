import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { EmbeddedData } from '../core/types';

const PLACEHOLDER = '__CLG_DATA_PLACEHOLDER__';

/** Inject the model JSON into the template, escaping `<` so it cannot break the script tag. */
export function injectData(template: string, data: EmbeddedData): string {
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`Template is missing the ${PLACEHOLDER} placeholder.`);
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return template.replace(PLACEHOLDER, json);
}

/** Resolve the bundled web template (dist/web/index.html relative to the CLI). */
export function templatePath(): string {
  return fileURLToPath(new URL('../web/index.html', import.meta.url));
}

/** Read the template, inject data, and write `<dest>.html`. Returns the output path. */
export async function emitHtml(dest: string, data: EmbeddedData): Promise<string> {
  const template = await readFile(templatePath(), 'utf8');
  const html = injectData(template, data);
  const outPath = dest.endsWith('.html') ? dest : `${dest}.html`;
  await writeFile(outPath, html, 'utf8');
  return outPath;
}
