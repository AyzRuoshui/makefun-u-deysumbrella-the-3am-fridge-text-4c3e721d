import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_ENTRY_CHARS = 140;

export const FRIDGE_TEXT =
  'Not to wake you at 3am, but the baking soda in my back corner has outlived two of your relationships.';

export interface EntryResult {
  readonly outputPath: string;
  readonly text: string;
  readonly chars: number;
  readonly bytes: number;
}

/** Resolve the target output directory, honoring MAKEFUN_OUTPUT_DIR locally. */
export function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.MAKEFUN_OUTPUT_DIR?.trim();
  return override && override.length > 0 ? override : '/output';
}

/** Validate that the entry text is a non-empty, single-line UTF-8 text within 140 chars. */
export function validateFridgeText(raw: string): string {
  const text = raw.trim();
  if (text.length === 0) {
    throw new Error('Fridge text must not be empty or whitespace-only.');
  }
  if (/[\r\n]/.test(text)) {
    throw new Error('Fridge text must be a single line.');
  }
  const chars = [...text].length;
  if (chars > MAX_ENTRY_CHARS || text.length > MAX_ENTRY_CHARS) {
    throw new Error(`Fridge text exceeds ${MAX_ENTRY_CHARS} characters (got ${chars}).`);
  }
  return text;
}

/** Write the validated 3am fridge text deterministically to entry.txt. */
export function writeFridgeEntry(outputDir: string = resolveOutputDir()): EntryResult {
  const text = validateFridgeText(FRIDGE_TEXT);
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'entry.txt');
  writeFileSync(outputPath, text, 'utf8');
  return {
    outputPath,
    text,
    chars: [...text].length,
    bytes: Buffer.byteLength(text, 'utf8'),
  };
}

function isDirectExecution(): boolean {
  const entryArg = process.argv[1];
  if (!entryArg) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(entryArg));
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  writeFridgeEntry();
}
