import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const REVIEW_STATES = new Set(['synced', 'needs-review']);

export function normalizeDocumentContent(content) {
  return content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n|\r/g, '\n');
}

export function hashDocumentContent(content) {
  const normalized = normalizeDocumentContent(content);

  return createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex');
}

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content.replace(/^\uFEFF/, ''));
}

function compareFileSets({ actualFiles, manifestFiles, side, errors }) {
  const actual = new Set(actualFiles);
  const declared = new Set(manifestFiles);

  for (const file of actual) {
    if (!declared.has(file)) {
      errors.push(`${side}/${file}: missing from DOC_SYNC_MANIFEST.json`);
    }
  }

  for (const file of declared) {
    if (!actual.has(file)) {
      errors.push(`${side}/${file}: declared in manifest but file is missing`);
    }
  }
}

function validateEntryShape(entry, index, errors) {
  const label = `documents[${index}]`;

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`${label}: expected an object`);
    return false;
  }

  if (
    typeof entry.file !== 'string'
    || path.basename(entry.file) !== entry.file
    || !entry.file.endsWith('.md')
  ) {
    errors.push(`${label}.file: expected a Markdown basename without traversal`);
  }

  if (!Number.isInteger(entry.revision) || entry.revision < 1) {
    errors.push(`${label}.revision: expected a positive integer`);
  }

  if (!REVIEW_STATES.has(entry.reviewStatus)) {
    errors.push(`${label}.reviewStatus: expected synced or needs-review`);
  }

  for (const hashField of ['sourceSha256', 'translationSha256']) {
    if (typeof entry[hashField] !== 'string' || !/^[a-f0-9]{64}$/.test(entry[hashField])) {
      errors.push(`${label}.${hashField}: expected a lowercase SHA-256 hash`);
    }
  }

  return typeof entry.file === 'string';
}

function extractMarkdownStructure(content) {
  const headings = [];
  const fenceLanguages = [];
  const linkTargets = [];
  const inlineCode = [];
  let activeFence = null;

  for (const line of normalizeDocumentContent(content).split('\n')) {
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w-]*)/);

    if (fence) {
      const marker = fence[1][0];

      if (activeFence === null) {
        activeFence = marker;
        fenceLanguages.push(fence[2]);
      } else if (activeFence === marker) {
        activeFence = null;
      }

      continue;
    }

    if (activeFence !== null) {
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+/);

    if (heading) {
      headings.push(heading[1].length);
    }

    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
      linkTargets.push(match[1]);
    }

    for (const match of line.matchAll(/`([^`]+)`/g)) {
      inlineCode.push(match[1]);
    }
  }

  return {
    headings,
    fenceLanguages,
    linkTargets: linkTargets.sort(),
    inlineCode: inlineCode.sort(),
  };
}

function compareStructure({ entry, source, translation, errors }) {
  const sourceStructure = extractMarkdownStructure(source);
  const translationStructure = extractMarkdownStructure(translation);
  const checks = [
    ['heading levels', 'headings'],
    ['code fence languages', 'fenceLanguages'],
    ['link targets', 'linkTargets'],
    ['inline code tokens', 'inlineCode'],
  ];

  for (const [label, property] of checks) {
    const sourceValue = JSON.stringify(sourceStructure[property]);
    const translationValue = JSON.stringify(translationStructure[property]);

    if (sourceValue !== translationValue) {
      errors.push(`${entry.file}: synced pair has different ${label}`);
    }
  }
}

async function validateEntryContent({
  entry,
  canonicalDirectory,
  translationDirectory,
  requireReviewed,
  errors,
  warnings,
}) {
  const canonicalPath = path.join(canonicalDirectory, entry.file);
  const translationPath = path.join(translationDirectory, entry.file);

  const [canonicalContent, translationContent] = await Promise.all([
    readFile(canonicalPath, 'utf8'),
    readFile(translationPath, 'utf8'),
  ]);

  const sourceHash = hashDocumentContent(canonicalContent);
  const translationHash = hashDocumentContent(translationContent);

  if (sourceHash !== entry.sourceSha256) {
    errors.push(`${entry.file}: canonical docs_vi content changed without a manifest update`);
  }

  if (translationHash !== entry.translationSha256) {
    errors.push(`${entry.file}: English translation changed without a manifest update`);
  }

  if (entry.reviewStatus === 'needs-review') {
    const message = `${entry.file}: semantic translation review is still required`;

    if (requireReviewed) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  } else {
    compareStructure({
      entry,
      source: canonicalContent,
      translation: translationContent,
      errors,
    });
  }
}

export async function inspectDocumentationSync({
  rootDirectory,
  requireReviewed = false,
}) {
  const canonicalDirectory = path.join(rootDirectory, 'docs_vi');
  const translationDirectory = path.join(rootDirectory, 'docs');
  const manifestPath = path.join(translationDirectory, 'DOC_SYNC_MANIFEST.json');
  const errors = [];
  const warnings = [];

  let manifest;

  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    return {
      errors: [`DOC_SYNC_MANIFEST.json: ${error.message}`],
      warnings,
      documentCount: 0,
    };
  }

  if (manifest.schemaVersion !== 1) {
    errors.push('DOC_SYNC_MANIFEST.json: schemaVersion must equal 1');
  }

  if (manifest.canonicalDirectory !== 'docs_vi') {
    errors.push('DOC_SYNC_MANIFEST.json: canonicalDirectory must equal docs_vi');
  }

  if (manifest.translationDirectory !== 'docs') {
    errors.push('DOC_SYNC_MANIFEST.json: translationDirectory must equal docs');
  }

  if (!Array.isArray(manifest.documents)) {
    errors.push('DOC_SYNC_MANIFEST.json: documents must be an array');

    return { errors, warnings, documentCount: 0 };
  }

  const [canonicalFiles, translationFiles] = await Promise.all([
    listMarkdownFiles(canonicalDirectory),
    listMarkdownFiles(translationDirectory),
  ]);

  const manifestFiles = [];
  const seenFiles = new Set();

  manifest.documents.forEach((entry, index) => {
    if (!validateEntryShape(entry, index, errors)) {
      return;
    }

    manifestFiles.push(entry.file);

    if (seenFiles.has(entry.file)) {
      errors.push(`${entry.file}: duplicate manifest entry`);
    }

    seenFiles.add(entry.file);
  });

  compareFileSets({
    actualFiles: canonicalFiles,
    manifestFiles,
    side: 'docs_vi',
    errors,
  });
  compareFileSets({
    actualFiles: translationFiles,
    manifestFiles,
    side: 'docs',
    errors,
  });

  if (errors.length === 0) {
    for (const entry of manifest.documents) {
      await validateEntryContent({
        entry,
        canonicalDirectory,
        translationDirectory,
        requireReviewed,
        errors,
        warnings,
      });
    }
  }

  return {
    errors,
    warnings,
    documentCount: manifest.documents.length,
  };
}
