import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSourceFiles, inspectSourceFile, SOURCE_LIMITS } from './source-limits.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const requestedPaths = process.argv.slice(2);
const targets = requestedPaths.length > 0 ? requestedPaths : ['.'];

async function main() {
  const discovered = await Promise.all(
    targets.map((target) => findSourceFiles(path.resolve(projectRoot, target))),
  );

  const files = [...new Set(discovered.flat())].sort();

  if (files.length === 0) {
    throw new Error('No source files found. Check the requested paths.');
  }

  const reports = await Promise.all(files.map(inspectSourceFile));
  const failures = reports.filter(
    (report) => report.exceedsLineLimit || report.longLines.length > 0,
  );

  for (const report of failures) {
    const fileName = path.relative(projectRoot, report.filePath);
    const details = [];

    if (report.exceedsLineLimit) {
      details.push(`${report.lineCount} lines; maximum ${SOURCE_LIMITS.maxLines}`);
    }

    if (report.longLines.length > 0) {
      const examples = report.longLines
        .slice(0, 3)
        .map(({ line, columns }) => `L${line}: ${columns}`)
        .join(', ');

      details.push(`${report.longLines.length} long lines (${examples} columns)`);
    }

    console.error(`${fileName}: ${details.join('; ')}`);
  }

  const message = failures.length === 0
    ? `PASS: ${files.length} source files meet size limits.`
    : `FAIL: ${failures.length}/${files.length} source files violate size/readability limits.`;

  console.log(message);
  console.log('This check does not validate formatting, duplication, imports or app behavior.');
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
