import isCi from 'is-ci';

export const ANSI = {
  ALT_SCREEN_ENTER: '\x1b[?1049h',
  ALT_SCREEN_EXIT: '\x1b[?1049l',
  CLEAR_SCREEN: '\x1b[2J',
  MOVE_CURSOR_HOME: '\x1b[H',
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  CLEAR_LINE: '\x1b[2K',
  MOVE_CURSOR_UP: (lines: number) => `\x1b[${lines}A`,
  MOVE_CURSOR_DOWN: (lines: number) => `\x1b[${lines}B`,
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
} as const;

export function isInteractive(): boolean {
  return (
    !isCi &&
    process.stdout.isTTY &&
    process.stdin.isTTY &&
    process.env.NO_COLOR === undefined
  );
}

export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

export function enableAltScreen(): void {
  process.stdout.write(ANSI.ALT_SCREEN_ENTER);
}

export function disableAltScreen(): void {
  process.stdout.write(ANSI.ALT_SCREEN_EXIT);
}

export function clearScreen(): void {
  process.stdout.write(`${ANSI.CLEAR_SCREEN}${ANSI.MOVE_CURSOR_HOME}`);
}

export function showCursor(): void {
  process.stdout.write(ANSI.SHOW_CURSOR);
}

export function hideCursor(): void {
  process.stdout.write(ANSI.HIDE_CURSOR);
}

export function clearLine(): void {
  process.stdout.write(ANSI.CLEAR_LINE);
}

export type ResizeHandler = () => void;

export function listenForResize(handler: ResizeHandler): () => void {
  process.stdout.on('resize', handler);
  return () => {
    process.stdout.off('resize', handler);
  };
}
