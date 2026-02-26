import React from 'react';
import { Box, Text } from 'ink';

type Props = {
  lines: string[];
  scrollOffset: number;
  height: number;
};

export function OutputPane({ lines, scrollOffset, height }: Props) {
  const visibleLines = lines.slice(scrollOffset, scrollOffset + height);

  if (lines.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        width="100%"
        height={height + 2}
      >
        <Text dimColor>No console output captured.</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      height={height + 2}
    >
      {visibleLines.map((line, i) => (
        <Text key={scrollOffset + i} wrap="truncate">
          {line}
        </Text>
      ))}
    </Box>
  );
}
