import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { EmbeddedData } from '../core/types';

const PLACEHOLDER = '__CLG_DATA_PLACEHOLDER__';
const DATA_SCRIPT_RE =
  /(<script\b(?=[^>]*\bid=["']clg-data["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>)([\s\S]*?)(<\/script>)/;

/** Inject the model JSON into the template, escaping `<` so it cannot break the script tag. */
export function injectData(template: string, data: EmbeddedData): string {
  let injected = false;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = template.replace(
    DATA_SCRIPT_RE,
    (script, open: string, body: string, close: string) => {
      if (!body.includes(PLACEHOLDER)) return script;
      injected = true;
      return `${open}${json}${close}`;
    },
  );

  if (!injected) {
    throw new Error(`Template is missing the ${PLACEHOLDER} placeholder in the clg-data script.`);
  }

  return html;
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
