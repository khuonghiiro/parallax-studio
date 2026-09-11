import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  hashDocumentContent,
  inspectDocumentationSync,
  normalizeDocumentContent,
} from './doc-sync.mjs';

async function createFixture({ reviewStatus = 'synced' } = {}) {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'parallax-doc-sync-'));
  const canonicalDirectory = path.join(rootDirectory, 'docs_vi');
  const translationDirectory = path.join(rootDirectory, 'docs');
  const canonicalContent = '# Kế hoạch\r\n\r\nNội dung.\r\n';
  const translationContent = '# Plan\n\nContent.\n';

  await Promise.all([
    mkdir(canonicalDirectory, { recursive: true }),
    mkdir(translationDirectory, { recursive: true }),
  ]);

  await Promise.all([
    writeFile(path.join(canonicalDirectory, 'PLAN.md'), canonicalContent),
    writeFile(path.join(translationDirectory, 'PLAN.md'), translationContent),
  ]);

  const manifest = {
    schemaVersion: 1,
    canonicalDirectory: 'docs_vi',
    translationDirectory: 'docs',
    documents: [
      {
        file: 'PLAN.md',
        revision: 1,
        reviewStatus,
        sourceSha256: hashDocumentContent(canonicalContent),
        translationSha256: hashDocumentContent(translationContent),
      },
    ],
  };

  await writeFile(
    path.join(translationDirectory, 'DOC_SYNC_MANIFEST.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return rootDirectory;
}

test('normalizes BOM and line endings before hashing', () => {
  const windowsContent = '\uFEFFA\r\nB\r\n';
  const unixContent = 'A\nB\n';

  assert.equal(normalizeDocumentContent(windowsContent), unixContent);
  assert.equal(
    hashDocumentContent(windowsContent),
    hashDocumentContent(unixContent),
  );
});

test('accepts a complete reviewed pair with current hashes', async (context) => {
  const rootDirectory = await createFixture();
  context.after(() => rm(rootDirectory, { recursive: true, force: true }));

  const result = await inspectDocumentationSync({ rootDirectory });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.documentCount, 1);
});

test('detects canonical content changed after the manifest', async (context) => {
  const rootDirectory = await createFixture();
  context.after(() => rm(rootDirectory, { recursive: true, force: true }));

  await writeFile(
    path.join(rootDirectory, 'docs_vi', 'PLAN.md'),
    '# Kế hoạch\n\nNội dung đã đổi.\n',
  );

  const result = await inspectDocumentationSync({ rootDirectory });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /canonical docs_vi content changed/);
});

test('detects a counterpart missing from the translation directory', async (context) => {
  const rootDirectory = await createFixture();
  context.after(() => rm(rootDirectory, { recursive: true, force: true }));

  await rm(path.join(rootDirectory, 'docs', 'PLAN.md'));

  const result = await inspectDocumentationSync({ rootDirectory });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /declared in manifest but file is missing/);
});

test('reports pending review as warning or strict error', async (context) => {
  const rootDirectory = await createFixture({ reviewStatus: 'needs-review' });
  context.after(() => rm(rootDirectory, { recursive: true, force: true }));

  const normalResult = await inspectDocumentationSync({ rootDirectory });
  const strictResult = await inspectDocumentationSync({
    rootDirectory,
    requireReviewed: true,
  });

  assert.equal(normalResult.errors.length, 0);
  assert.equal(normalResult.warnings.length, 1);
  assert.equal(strictResult.errors.length, 1);
  assert.equal(strictResult.warnings.length, 0);
});

test('rejects a synced pair with a different heading structure', async (context) => {
  const rootDirectory = await createFixture();
  context.after(() => rm(rootDirectory, { recursive: true, force: true }));
  const translationPath = path.join(rootDirectory, 'docs', 'PLAN.md');
  const translationContent = '# Plan\n\n## Extra section\n\nContent.\n';

  await writeFile(translationPath, translationContent);

  const manifestPath = path.join(
    rootDirectory,
    'docs',
    'DOC_SYNC_MANIFEST.json',
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.documents[0].translationSha256 = hashDocumentContent(translationContent);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = await inspectDocumentationSync({ rootDirectory });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /different heading levels/);
});
