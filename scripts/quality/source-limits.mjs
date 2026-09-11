import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const SOURCE_LIMITS = Object.freeze({
  maxLines: 800,
  maxColumns: 120,
});

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.rs', '.py', '.css', '.scss', '.html', '.svg',
  '.json', '.toml', '.yaml', '.yml', '.wgsl', '.glsl',
  '.vert', '.frag', '.sh', '.ps1',
]);

const EXCLUDED_DIRECTORIES = new Set([
  '.git', '.tmp', '.runtime', '.sites-runtime', '.venv',
  'node_modules', 'target', 'dist', 'coverage', 'workspace',
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
]);

export function measureSource(source, limits = SOURCE_LIMITS) {
  const lines = source === '' ? [] : source.split(/\r\n|\n|\r/);

  // A terminating newline is not an extra physical line; other blank lines count.
  if (lines.at(-1) === '') {
    lines.pop();
  }

  const longLines = [];

  lines.forEach((line, index) => {
    const columns = [...line].length;

    if (columns > limits.maxColumns) {
      longLines.push({ line: index + 1, columns });
    }
  });

  return {
    lineCount: lines.length,
    exceedsLineLimit: lines.length > limits.maxLines,
    longLines,
  };
}

export async function findSourceFiles(target) {
  const metadata = await lstat(target);

  if (metadata.isSymbolicLink()) {
    return [];
  }

  const name = path.basename(target);

  if (metadata.isDirectory()) {
    if (EXCLUDED_DIRECTORIES.has(name)) {
      return [];
    }

    const entries = await readdir(target);
    const nestedFiles = await Promise.all(
      entries.map((entry) => findSourceFiles(path.join(target, entry))),
    );

    return nestedFiles.flat();
  }

  if (!metadata.isFile() || EXCLUDED_FILES.has(name)) {
    return [];
  }

  return SOURCE_EXTENSIONS.has(path.extname(name)) ? [target] : [];
}

export async function inspectSourceFile(filePath) {
  const source = await readFile(filePath, 'utf8');

  return {
    filePath,
    ...measureSource(source),
  };
}
