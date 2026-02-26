import { render } from 'ink';
import React from 'react';
import { App } from './app.js';

const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

export async function launchTui(files: string[]): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN + HIDE_CURSOR);

  const cleanup = () => {
    process.stdout.write(SHOW_CURSOR + EXIT_ALT_SCREEN);
  };

  const onSignal = () => {
    cleanup();
    process.exit(0);
  };

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    const { waitUntilExit } = render(<App files={files} />);
    await waitUntilExit();
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    cleanup();
  }
}
