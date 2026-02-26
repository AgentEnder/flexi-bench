import React, { useState, useCallback } from 'react';
import { Box } from 'ink';
import type { Result } from 'flexi-bench';
import { BenchmarkListScreen } from './screens/benchmark-list.js';
import { RunningScreen } from './screens/running.js';
import { ResultsScreen } from './screens/results.js';
import { useTerminalSize } from './hooks/use-terminal-size.js';
import { useBenchmarks } from './hooks/use-benchmarks.js';

/**
 * Serializable entry description for the PTY worker — carries
 * just the metadata needed to re-discover and run the entry
 * in a child process.
 */
export type RunEntry = {
  file: string;
  type: 'suite' | 'benchmark';
  name: string;
};

type Screen =
  | { type: 'list' }
  | { type: 'running'; entries: RunEntry[] }
  | { type: 'results'; results: ResultEntry[]; capturedOutput: string[] };

export type ResultEntry = {
  name: string;
  results: Result[];
};

export function App({ files }: { files: string[] }) {
  const [screen, setScreen] = useState<Screen>({ type: 'list' });
  const { rows } = useTerminalSize();
  const discovery = useBenchmarks(files);

  const onRun = useCallback((entries: RunEntry[]) => {
    setScreen({ type: 'running', entries });
  }, []);

  const onRunComplete = useCallback(
    (results: ResultEntry[], capturedOutput: string[]) => {
      setScreen({ type: 'results', results, capturedOutput });
    },
    [],
  );

  const onBackToList = useCallback(() => {
    setScreen({ type: 'list' });
  }, []);

  return (
    <Box flexDirection="column" height={rows}>
      {screen.type === 'list' && (
        <BenchmarkListScreen discovery={discovery} onRun={onRun} />
      )}
      {screen.type === 'running' && (
        <RunningScreen entries={screen.entries} onComplete={onRunComplete} />
      )}
      {screen.type === 'results' && (
        <ResultsScreen
          results={screen.results}
          capturedOutput={screen.capturedOutput}
          onBack={onBackToList}
        />
      )}
    </Box>
  );
}
