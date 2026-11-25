import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  FRIDGE_TEXT,
  MAX_ENTRY_CHARS,
  resolveOutputDir,
  validateFridgeText,
  writeFridgeEntry,
} from './main.ts';

test('resolveOutputDir defaults to /output and honors MAKEFUN_OUTPUT_DIR', () => {
  assert.equal(resolveOutputDir({}), '/output');
  assert.equal(resolveOutputDir({ MAKEFUN_OUTPUT_DIR: '   ' }), '/output');
  assert.equal(resolveOutputDir({ MAKEFUN_OUTPUT_DIR: '/custom/out' }), '/custom/out');
});

test('validateFridgeText enforces non-empty single-line 140-char constraint', () => {
  const validated = validateFridgeText(FRIDGE_TEXT);
  assert.equal(validated, FRIDGE_TEXT);
  assert.ok(validated.length >= 1 && validated.length <= MAX_ENTRY_CHARS);
  assert.ok([...validated].length <= MAX_ENTRY_CHARS);
  assert.ok(!/[\r\n]/.test(validated));

  assert.throws(() => validateFridgeText('   \t  '));
  assert.throws(() => validateFridgeText('line one\nline two'));
  assert.throws(() => validateFridgeText('x'.repeat(MAX_ENTRY_CHARS + 1)));
});

test('writeFridgeEntry writes deterministic UTF-8 entry.txt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fridge-unit-'));
  try {
    const first = writeFridgeEntry(dir);
    const second = writeFridgeEntry(dir);
    assert.deepEqual(first, second);

    const disk = readFileSync(join(dir, 'entry.txt'), 'utf8');
    assert.equal(disk, FRIDGE_TEXT);
    assert.equal(disk.length, first.chars);
    assert.equal(Buffer.byteLength(disk, 'utf8'), first.bytes);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI execution via node main.ts honors MAKEFUN_OUTPUT_DIR deterministically', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fridge-cli-'));
  try {
    const env = { ...process.env, MAKEFUN_OUTPUT_DIR: dir };
    execFileSync(process.execPath, ['main.ts'], { env });
    const run1 = readFileSync(join(dir, 'entry.txt'));

    execFileSync(process.execPath, ['main.ts'], { env });
    const run2 = readFileSync(join(dir, 'entry.txt'));

    assert.equal(Buffer.compare(run1, run2), 0);
    const text = run1.toString('utf8');
    assert.equal(text, FRIDGE_TEXT);
    assert.ok(text.length >= 1 && text.length <= 140);
    assert.ok(!text.includes('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
