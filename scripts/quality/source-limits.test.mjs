import assert from 'node:assert/strict';
import test from 'node:test';
import { measureSource } from './source-limits.mjs';

test('accepts exactly 800 physical lines and rejects 801', () => {
  const allowed = measureSource('const value = 1;\n'.repeat(800));
  const rejected = measureSource('const value = 1;\n'.repeat(801));

  assert.equal(allowed.lineCount, 800);
  assert.equal(allowed.exceedsLineLimit, false);
  assert.equal(rejected.lineCount, 801);
  assert.equal(rejected.exceedsLineLimit, true);
});

test('counts comments and blank lines; cannot bypass the limit by mixing them', () => {
  const source = `${'// comment\n\n'.repeat(400)}const extra = 1;`;
  const result = measureSource(source);

  assert.equal(result.lineCount, 801);
  assert.equal(result.exceedsLineLimit, true);
});

test('normalizes line endings without discarding real blank lines', () => {
  const unix = measureSource('first\nsecond\n\n');
  const windows = measureSource('first\r\nsecond\r\n\r\n');
  const withoutFinalNewline = measureSource('first\nsecond');

  assert.equal(unix.lineCount, 3);
  assert.deepEqual(windows, unix);
  assert.equal(withoutFinalNewline.lineCount, 2);
  assert.equal(measureSource('').lineCount, 0);
});

test('flags dense code even when the file contains only one line', () => {
  const packedStatements = 'const temporary = 1;'.repeat(20);
  const result = measureSource(packedStatements);

  assert.equal(result.exceedsLineLimit, false);
  assert.deepEqual(result.longLines, [{ line: 1, columns: packedStatements.length }]);
});

test('enforces the exact column boundary', () => {
  assert.deepEqual(measureSource('x'.repeat(120)).longLines, []);
  assert.deepEqual(measureSource('x'.repeat(121)).longLines, [{ line: 1, columns: 121 }]);
});
