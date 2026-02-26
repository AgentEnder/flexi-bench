import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { BenchmarkItem, UseBenchmarksResult } from '../hooks/use-benchmarks.js';
import type { RunEntry } from '../app.js';
import { Spinner } from '../components/spinner.js';
import { StatusBar } from '../components/status-bar.js';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

type Props = {
  discovery: UseBenchmarksResult;
  onRun: (entries: RunEntry[]) => void;
};

export function BenchmarkListScreen({ discovery, onRun }: Props) {
  const { items, loading, error } = discovery;
  const { exit } = useApp();
  const { rows } = useTerminalSize();
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Account for: header (1) + gap (1) + status bar (1) = 3
  const visibleListHeight = Math.max(1, rows - 3);

  const toggleSelection = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const item = items.find((i) => i.id === id);
        if (!item) return prev;

        const wasSelected = next.has(id);

        if (wasSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }

        // Cascade: toggling a suite toggles all its child benchmarks
        if (item.entry.type === 'suite') {
          const suiteName = item.entry.instance.name;
          for (const child of items) {
            if (child.parentSuite === suiteName) {
              if (wasSelected) {
                next.delete(child.id);
              } else {
                next.add(child.id);
              }
            }
          }
        }

        return next;
      });
    },
    [items],
  );

  const selectAll = useCallback(() => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }, [items, selected.size]);

  const getSelectedRunEntries = useCallback((): RunEntry[] => {
    if (selected.size === 0 && items.length > 0) {
      const item = items[cursor];
      return [{ file: item.file, type: item.entry.type, name: item.entry.instance.name }];
    }
    const selectedItems = items.filter((i) => selected.has(i.id));
    const selectedSuiteNames = new Set(
      selectedItems
        .filter((i) => i.entry.type === 'suite')
        .map((i) => i.entry.instance.name),
    );

    return selectedItems
      .filter(
        (i) =>
          i.entry.type === 'suite' ||
          !i.parentSuite ||
          !selectedSuiteNames.has(i.parentSuite),
      )
      .map((i) => ({ file: i.file, type: i.entry.type, name: i.entry.instance.name }));
  }, [items, selected, cursor]);

  useInput((input, key) => {
    if (loading) return;

    if (input === 'q') {
      exit();
      return;
    }

    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCursor((prev) => Math.min(items.length - 1, prev + 1));
    }
    if (input === ' ') {
      if (items[cursor]) {
        toggleSelection(items[cursor].id);
      }
    }
    if (input === 'a') {
      selectAll();
    }
    if (key.return) {
      const entries = getSelectedRunEntries();
      if (entries.length > 0) {
        onRun(entries);
      }
    }
  });

  if (loading) {
    return <Spinner label="Discovering benchmarks..." />;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (items.length === 0) {
    return (
      <Text color="yellow">No benchmarks found in the provided files.</Text>
    );
  }

  // Scroll the list view to keep cursor visible
  const scrollStart = Math.max(
    0,
    Math.min(
      cursor - Math.floor(visibleListHeight / 2),
      items.length - visibleListHeight,
    ),
  );
  const visibleItems = items.slice(
    scrollStart,
    scrollStart + visibleListHeight,
  );

  return (
    <Box flexDirection="column" height={rows}>
      <Box marginBottom={1}>
        <Text bold>Flexi-Bench</Text>
        <Text dimColor> — {items.length} items discovered</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {visibleItems.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            isCursor={items.indexOf(item) === cursor}
            isSelected={selected.has(item.id)}
          />
        ))}
      </Box>

      <StatusBar
        keys={[
          { key: '↑↓', action: 'navigate' },
          { key: 'space', action: 'select' },
          { key: 'a', action: 'select all' },
          { key: 'enter', action: 'run' },
          { key: 'q', action: 'quit' },
        ]}
      />
    </Box>
  );
}

function ListItem({
  item,
  isCursor,
  isSelected,
}: {
  item: BenchmarkItem;
  isCursor: boolean;
  isSelected: boolean;
}) {
  const pointer = isCursor ? '❯' : ' ';
  const checkbox = isSelected ? '◉' : '○';
  const isSuite = item.entry.type === 'suite';

  return (
    <Box>
      <Text color={isCursor ? 'cyan' : undefined}>
        {pointer} {checkbox}{' '}
      </Text>
      <Text
        bold={isSuite}
        color={isCursor ? 'cyan' : isSuite ? 'green' : undefined}
      >
        {item.label}
      </Text>
    </Box>
  );
}
