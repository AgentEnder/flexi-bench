import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useBenchmarkRunner } from '../hooks/use-benchmark-runner.js';
import type { RunEntry, ResultEntry } from '../app.js';
import { Spinner } from '../components/spinner.js';
import { OutputPane } from '../components/output-pane.js';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

type Props = {
  entries: RunEntry[];
  onComplete: (results: ResultEntry[], capturedOutput: string[]) => void;
};

export function RunningScreen({ entries, onComplete }: Props) {
  const { state, run } = useBenchmarkRunner();
  const { columns, rows } = useTerminalSize();

  useEffect(() => {
    run(entries, onComplete);
  }, []);

  // Progress bar scales to terminal width
  const barWidth = Math.max(10, columns - 4);
  const filled =
    state.total > 0
      ? Math.round((state.completed / state.total) * barWidth)
      : 0;

  // Layout: header(1) + spinner(1) + gap(1) + progress(1) + bar(1) + gap(1) + pane border(2) = 8
  const paneHeight = Math.max(3, rows - 8);

  // Auto-scroll to bottom of output
  const scrollOffset = Math.max(0, state.outputLines.length - paneHeight);

  return (
    <Box flexDirection="column" height={rows}>
      <Box marginBottom={1}>
        <Text bold>Running Benchmarks</Text>
      </Box>

      {state.currentName ? (
        <Spinner label={`Running: ${state.currentName}`} />
      ) : (
        <Spinner label="Preparing..." />
      )}

      <Box marginTop={1}>
        <Text dimColor>
          Progress: {state.completed}/{state.total}
        </Text>
      </Box>

      {state.total > 0 && (
        <Box>
          <Text dimColor>
            [
            <Text color="green">{'█'.repeat(filled)}</Text>
            <Text dimColor>{'░'.repeat(barWidth - filled)}</Text>]
          </Text>
        </Box>
      )}

      <Box marginTop={1} flexGrow={1}>
        <OutputPane
          lines={state.outputLines}
          scrollOffset={scrollOffset}
          height={paneHeight}
        />
      </Box>
    </Box>
  );
}
