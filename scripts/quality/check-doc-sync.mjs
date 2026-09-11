import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectDocumentationSync } from './doc-sync.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..', '..');
const requireReviewed = process.argv.includes('--require-reviewed');

const result = await inspectDocumentationSync({
  rootDirectory,
  requireReviewed,
});

for (const warning of result.warnings) {
  console.warn(`WARN: ${warning}`);
}

for (const error of result.errors) {
  console.error(`ERROR: ${error}`);
}

if (result.errors.length > 0) {
  console.error(
    `FAIL: documentation sync found ${result.errors.length} error(s).`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `PASS: ${result.documentCount} bilingual document pair(s) have current hashes.`,
  );
}
