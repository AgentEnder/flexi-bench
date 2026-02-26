import xterm from '@xterm/headless';
const { Terminal } = xterm;

export type LiveTerminalHandle = {
  /** Feed raw PTY data. Returns a promise that resolves after parsing. */
  write(data: string): Promise<void>;
  /** Read the current normal-buffer lines (trimmed of trailing blanks). */
  getLines(): string[];
  /** Dispose the underlying terminal. */
  dispose(): void;
};

/**
 * Creates a persistent headless terminal for streaming PTY data.
 * Call write() as data arrives, getLines() to snapshot the current
 * buffer state, and dispose() when done.
 */
export function createLiveTerminal(cols: number): LiveTerminalHandle {
  const terminal = new Terminal({
    cols,
    rows: 500,
    allowProposedApi: true,
  });

  return {
    write(data: string): Promise<void> {
      return new Promise((resolve) => {
        terminal.write(data, resolve);
      });
    },

    getLines(): string[] {
      const buffer = terminal.buffer.normal;
      const lines: string[] = [];

      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }

      // Trim trailing empty lines
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }

      return lines;
    },

    dispose() {
      terminal.dispose();
    },
  };
}
