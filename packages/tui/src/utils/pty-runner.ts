import nodePty from 'node-pty';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Result } from 'flexi-bench';
import type { ResultEntry } from '../app.js';

const WORKER_PATH = fileURLToPath(
  new URL('../worker/run-entry.js', import.meta.url),
);

export type PtyRunResult = {
  results: ResultEntry[];
};

/**
 * Runs a single benchmark entry in a PTY subprocess.
 *
 * The worker gets a real terminal — reporters detect isTTY, enter alt
 * screen, render dashboards, etc. All output is captured by the PTY
 * master side and streamed to the onData callback for live rendering.
 * Structured results are written to a temp file by the worker.
 */
export function runEntryInPty(
  file: string,
  entryType: 'suite' | 'benchmark',
  entryName: string,
  cols: number,
  rows: number,
  onData?: (data: string) => void,
): Promise<PtyRunResult> {
  return new Promise((resolve) => {
    const resultsPath = join(tmpdir(), `flexi-bench-${randomUUID()}.json`);

    const ptyProcess = nodePty.spawn(
      process.execPath,
      [...process.execArgv, WORKER_PATH, file, entryType, entryName, resultsPath],
      {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      },
    );

    ptyProcess.onData((data: string) => {
      onData?.(data);
    });

    ptyProcess.onExit(() => {
      let results: ResultEntry[] = [];

      try {
        if (existsSync(resultsPath)) {
          const raw = readFileSync(resultsPath, 'utf8');
          const parsed = JSON.parse(raw) as Record<string, Result[]>;
          for (const [name, benchResults] of Object.entries(parsed)) {
            results.push({ name, results: benchResults });
          }
          unlinkSync(resultsPath);
        }
      } catch {
        // Results file may be missing or malformed if the benchmark crashed
      }

      resolve({ results });
    });
  });
}
