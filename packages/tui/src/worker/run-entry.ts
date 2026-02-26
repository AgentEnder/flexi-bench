/**
 * Worker script that runs a single benchmark entry in a PTY subprocess.
 *
 * Usage: node run-entry.js <file> <type> <name> <resultsPath>
 *
 * - Loads the benchmark file via flexi-bench's loadBenchmarkFile (collect-only)
 * - Finds the matching entry by type and name
 * - Disables collect-only mode and runs it
 * - Writes JSON results to <resultsPath>
 * - All reporter/console output flows to the PTY naturally
 */

import {
  loadBenchmarkFile,
  disableCollectOnlyMode,
} from 'flexi-bench';
import type { Result } from 'flexi-bench';
import { writeFileSync } from 'node:fs';

const [, , filePath, entryType, entryName, resultsPath] = process.argv;

if (!filePath || !entryType || !entryName || !resultsPath) {
  console.error(
    'Usage: run-entry.js <file> <type> <name> <resultsPath>',
  );
  process.exit(1);
}

async function main() {
  const { entries } = await loadBenchmarkFile(filePath);

  disableCollectOnlyMode();

  const entry = entries.find(
    (e) => e.type === entryType && e.instance.name === entryName,
  );

  if (!entry) {
    console.error(`Entry not found: ${entryType} "${entryName}"`);
    process.exit(1);
  }

  const results: Record<string, Result[]> = {};

  if (entry.type === 'suite') {
    const suiteResults = await entry.instance.run();
    // Suite.run() returns Record<string, Result[]>
    Object.assign(results, suiteResults);
  } else {
    const benchResults = await entry.instance.run();
    results[entryName] = benchResults;
  }

  writeFileSync(resultsPath, JSON.stringify(results));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
