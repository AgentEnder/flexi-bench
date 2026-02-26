import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { formatValue } from 'flexi-bench';
import type { Result } from 'flexi-bench';
import type { ResultEntry } from '../app.js';
import { StatusBar } from '../components/status-bar.js';
import { OutputPane } from '../components/output-pane.js';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

type Tab = 'results' | 'output';

type Props = {
  results: ResultEntry[];
  capturedOutput: string[];
  onBack: () => void;
};

export function ResultsScreen({ results, capturedOutput, onBack }: Props) {
  const { exit } = useApp();
  const { rows } = useTerminalSize();
  const [activeTab, setActiveTab] = useState<Tab>('results');
  const [resultsScrollOffset, setResultsScrollOffset] = useState(0);
  const [outputScrollOffset, setOutputScrollOffset] = useState(0);

  const lines = buildResultLines(results);
  // Account for: header (1) + gap (1) + tab bar (1) + gap (1) + status bar (1) + gap (1) = 6
  const visibleCount = Math.max(1, rows - 6);

  const currentLines = activeTab === 'results' ? lines : capturedOutput;
  const currentOffset =
    activeTab === 'results' ? resultsScrollOffset : outputScrollOffset;
  const setCurrentOffset =
    activeTab === 'results' ? setResultsScrollOffset : setOutputScrollOffset;
  const maxOffset = Math.max(0, currentLines.length - visibleCount);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }
    if (input === 'b' || key.escape) {
      onBack();
      return;
    }
    if (input === '1') {
      setActiveTab('results');
      return;
    }
    if (input === '2') {
      setActiveTab('output');
      return;
    }
    if (key.upArrow) {
      setCurrentOffset((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCurrentOffset((prev) => Math.min(maxOffset, prev + 1));
    }
  });

  if (results.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No results to display.</Text>
        <StatusBar
          keys={[
            { key: 'b', action: 'back' },
            { key: 'q', action: 'quit' },
          ]}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={rows}>
      <Box marginBottom={1}>
        <Text bold>Results</Text>
        {currentLines.length > visibleCount && (
          <Text dimColor>
            {' '}
            ({currentOffset + 1}-
            {Math.min(currentOffset + visibleCount, currentLines.length)} of{' '}
            {currentLines.length})
          </Text>
        )}
      </Box>

      <Box gap={2}>
        <Text
          bold={activeTab === 'results'}
          color={activeTab === 'results' ? 'cyan' : undefined}
          dimColor={activeTab !== 'results'}
        >
          [1] Results
        </Text>
        <Text
          bold={activeTab === 'output'}
          color={activeTab === 'output' ? 'cyan' : undefined}
          dimColor={activeTab !== 'output'}
        >
          [2] Console Output
          {capturedOutput.length > 0 && (
            <Text dimColor> ({capturedOutput.length})</Text>
          )}
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {activeTab === 'results' ? (
          <>
            {lines
              .slice(resultsScrollOffset, resultsScrollOffset + visibleCount)
              .map((line, i) => (
                <Text key={resultsScrollOffset + i}>{line}</Text>
              ))}
          </>
        ) : (
          <OutputPane
            lines={capturedOutput}
            scrollOffset={outputScrollOffset}
            height={visibleCount - 2}
          />
        )}
      </Box>

      <StatusBar
        keys={[
          { key: '1/2', action: 'switch tab' },
          { key: '↑↓', action: 'scroll' },
          { key: 'b/Esc', action: 'back to list' },
          { key: 'q', action: 'quit' },
        ]}
      />
    </Box>
  );
}

function buildResultLines(results: ResultEntry[]): string[] {
  const lines: string[] = [];
  const separator = '────────────────────────────────────────';

  for (const entry of results) {
    lines.push(`${separator}`);
    lines.push(`Benchmark: ${entry.name}`);
    lines.push('');

    for (const result of entry.results) {
      lines.push(`  Variation: ${result.label}`);
      const type = result.type;
      lines.push(`    Average: ${formatValue(result.average, type)}`);
      lines.push(`    Min:     ${formatValue(result.min, type)}`);
      lines.push(`    Max:     ${formatValue(result.max, type)}`);
      lines.push(`    P95:     ${formatValue(result.p95, type)}`);

      if (result.iterations !== undefined) {
        lines.push(`    Iterations: ${result.iterations}`);
      }
      if (result.totalDuration !== undefined) {
        lines.push(
          `    Total Duration: ${formatValue(result.totalDuration, 'time')}`,
        );
      }
      if (result.failed) {
        lines.push(
          `    ⚠ Failure Rate: ${((result.failureRate ?? 0) * 100).toFixed(1)}%`,
        );
      }

      if (result.subresults && result.subresults.length > 0) {
        for (const sub of result.subresults) {
          lines.push(`    [${sub.label}]`);
          lines.push(
            `      Avg: ${formatValue(sub.average, sub.type)}  Min: ${formatValue(sub.min, sub.type)}  Max: ${formatValue(sub.max, sub.type)}`,
          );
        }
      }

      lines.push('');
    }
  }

  lines.push(separator);
  return lines;
}
