import { useState, useCallback } from 'react';
import type { RunEntry, ResultEntry } from '../app.js';
import { runEntryInPty } from '../utils/pty-runner.js';
import { createLiveTerminal } from '../utils/output-sanitizer.js';

export type RunnerState = {
  running: boolean;
  currentName: string | null;
  completed: number;
  total: number;
  outputLines: string[];
};

export function useBenchmarkRunner() {
  const [state, setState] = useState<RunnerState>({
    running: false,
    currentName: null,
    completed: 0,
    total: 0,
    outputLines: [],
  });

  const run = useCallback(
    async (
      entries: RunEntry[],
      onComplete: (results: ResultEntry[], capturedOutput: string[]) => void,
    ) => {
      const total = entries.length;
      setState({
        running: true,
        currentName: null,
        completed: 0,
        total,
        outputLines: [],
      });

      const results: ResultEntry[] = [];
      const cols = process.stdout.columns || 120;
      const rows = process.stdout.rows || 24;

      // Persistent terminal that accumulates all PTY output across entries
      const liveTerminal = createLiveTerminal(cols);
      let throttleTimer: ReturnType<typeof setTimeout> | null = null;

      const flushLines = () => {
        const lines = liveTerminal.getLines();
        setState((prev) => ({ ...prev, outputLines: lines }));
      };

      const scheduleFlush = () => {
        if (throttleTimer === null) {
          throttleTimer = setTimeout(() => {
            throttleTimer = null;
            flushLines();
          }, 32);
        }
      };

      for (const entry of entries) {
        setState((prev) => ({ ...prev, currentName: entry.name }));

        const { results: entryResults } = await runEntryInPty(
          entry.file,
          entry.type,
          entry.name,
          cols,
          rows,
          (data) => {
            // Fire-and-forget write; schedule throttled UI update
            liveTerminal.write(data).then(scheduleFlush);
          },
        );

        results.push(...entryResults);

        setState((prev) => ({
          ...prev,
          completed: prev.completed + 1,
        }));
      }

      // Clear any pending throttle and do a final flush
      if (throttleTimer !== null) {
        clearTimeout(throttleTimer);
      }
      // Wait for any remaining writes to finish
      await liveTerminal.write('');
      const capturedOutput = liveTerminal.getLines();
      liveTerminal.dispose();

      setState((prev) => ({
        ...prev,
        running: false,
        currentName: null,
        outputLines: capturedOutput,
      }));
      onComplete(results, capturedOutput);
    },
    [],
  );

  return { state, run };
}
