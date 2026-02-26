/**
 * Summary reporting utilities for CLI commands.
 * All summary output is written to stderr to avoid polluting piped stdout.
 */

export type CommandSummary = {
  filesProcessed: number;
  benchmarksFound: number;
  benchmarksRun: number;
  benchmarksSucceeded: number;
  benchmarksFailed: number;
  warnings: string[];
};

export type ListSummary = Pick<
  CommandSummary,
  'filesProcessed' | 'benchmarksFound' | 'warnings'
>;

const SEPARATOR = '────────────────────────────────────────';

function writeStderr(line: string): void {
  process.stderr.write(line + '\n');
}

function printWarnings(warnings: string[]): void {
  if (warnings.length === 0) return;
  writeStderr(`Warnings:   ${warnings.length}`);
  for (const w of warnings) {
    writeStderr(`  ⚠ ${w}`);
  }
}

export function printSummary(summary: CommandSummary): void {
  writeStderr(`─ Summary ${SEPARATOR.slice(10)}`);
  writeStderr(`Files:      ${summary.filesProcessed} processed`);

  const parts = [`${summary.benchmarksFound} found`];
  if (summary.benchmarksRun > 0 || summary.benchmarksFailed > 0) {
    parts.push(`${summary.benchmarksRun} run`);
    parts.push(`${summary.benchmarksSucceeded} succeeded`);
    parts.push(`${summary.benchmarksFailed} failed`);
  }
  writeStderr(`Benchmarks: ${parts.join(', ')}`);

  printWarnings(summary.warnings);
  writeStderr(SEPARATOR);
}

export function printListSummary(summary: ListSummary): void {
  writeStderr(`─ Summary ${SEPARATOR.slice(10)}`);
  writeStderr(`Files:      ${summary.filesProcessed} processed`);
  writeStderr(`Benchmarks: ${summary.benchmarksFound} found`);
  printWarnings(summary.warnings);
  writeStderr(SEPARATOR);
}
