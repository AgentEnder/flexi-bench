import React from 'react';
import { Box, Text } from 'ink';

export function StatusBar({ keys }: { keys: { key: string; action: string }[] }) {
  return (
    <Box marginTop={1}>
      <Text dimColor>
        {keys.map((k, i) => (
          <Text key={k.key}>
            {i > 0 ? '  ' : ''}
            <Text bold>{k.key}</Text> {k.action}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
