import { SuiteReporter } from '../api-types';
import { Result } from '../results';
import {
  ANSI,
  clearScreen,
  disableAltScreen,
  enableAltScreen,
  hideCursor,
  isInteractive,
  showCursor,
  listenForResize,
  getTerminalWidth,
} from '../utils/terminal';
import { renderResults } from '../utils/table-renderer';

function getNoColorOption(explicitNoColor?: boolean): boolean {
  if (explicitNoColor !== undefined) {
    return explicitNoColor;
  }
  return process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';
}

export class SuiteConsoleReporter implements SuiteReporter {
  private noColor: boolean;

  private inAltScreen: boolean = false;
  private suiteName: string = '';
  private currentBenchmark: string = '';
  private benchmarkResults: Record<string, Result[]> = {};
  private benchmarkIndex: number = 0;
  private totalBenchmarks: number = 0;
  private unsubscribeResize?: () => void;
  private lastRenderedBenchmark: number = -1;
  private dashboardInitialized: boolean = false;
  private dashboardLineCount: number = 0;

  constructor(opts?: { noColor?: boolean }) {
    this.noColor = getNoColorOption(opts?.noColor);
  }

  enterAltScreen(): void {
    if (isInteractive() && !this.inAltScreen) {
      enableAltScreen();
      hideCursor();
      this.inAltScreen = true;
      this.unsubscribeResize = listenForResize(() => this.renderDashboard());
    }
  }

  exitAltScreen(): void {
    if (this.inAltScreen) {
      showCursor();
      disableAltScreen();
      this.inAltScreen = false;
      if (this.unsubscribeResize) {
        this.unsubscribeResize();
        this.unsubscribeResize = undefined;
      }
    }
  }

  renderDashboard(): void {
    if (!this.inAltScreen || !isInteractive()) {
      return;
    }

    if (
      !this.dashboardInitialized ||
      this.lastRenderedBenchmark !== this.benchmarkIndex
    ) {
      if (!this.dashboardInitialized) {
        clearScreen();
      } else {
        for (let i = 0; i < this.dashboardLineCount; i++) {
          process.stdout.write(`${ANSI.MOVE_CURSOR_HOME}${ANSI.CLEAR_LINE}`);
          process.stdout.write(`${ANSI.MOVE_CURSOR_DOWN}`);
        }
        process.stdout.write(`${ANSI.MOVE_CURSOR_HOME}`);
      }

      const width = getTerminalWidth();
      const title = this.noColor
        ? `Suite: ${this.suiteName}`
        : `${ANSI.BOLD}Suite: ${this.suiteName}${ANSI.RESET}`;
      process.stdout.write(`${title}\n\n`);

      const progress =
        this.totalBenchmarks > 0
          ? Math.floor((this.benchmarkIndex / this.totalBenchmarks) * 100)
          : 0;
      const barWidth = Math.min(width - 20, 50);
      const filled = Math.floor((progress / 100) * barWidth);
      const empty = barWidth - filled;
      const barChar = this.noColor ? '#' : '\u2588';
      const emptyChar = this.noColor ? '-' : '\u2591';

      const bar = `${barChar.repeat(filled)}${emptyChar.repeat(empty)}`;
      const status = this.noColor
        ? `${bar} ${progress}%`
        : `${ANSI.GREEN}${bar}${ANSI.RESET} ${progress}%`;

      process.stdout.write(`  Overall Progress: ${status}\n`);
      process.stdout.write(
        `  Benchmark: ${this.benchmarkIndex + 1} / ${this.totalBenchmarks}\n`,
      );
      process.stdout.write(`  Current: ${this.currentBenchmark}`);

      this.dashboardLineCount = 4;

      this.dashboardInitialized = true;
      this.lastRenderedBenchmark = this.benchmarkIndex;
    }
  }

  onSuiteStart(suiteName: string): void {
    this.suiteName = suiteName;
    this.enterAltScreen();
    this.renderDashboard();
  }

  onBenchmarkStart(benchmarkName: string): void {
    this.currentBenchmark = benchmarkName;
    this.benchmarkIndex++;
    if (this.inAltScreen) {
      this.renderDashboard();
    }
  }

  onBenchmarkEnd(benchmarkName: string, results: Result[]): void {
    this.benchmarkResults[benchmarkName] = results;
    if (this.inAltScreen) {
      this.renderDashboard();
    }
  }

  report: (results: Record<string, Result[]>) => void = (results) => {
    this.exitAltScreen();

    const header = this.noColor
      ? 'Suite Results:'
      : `${ANSI.BOLD}Suite Results:${ANSI.RESET}`;
    console.log(header);

    for (const [name, result] of Object.entries(results)) {
      renderResults(name, result, this.noColor);
    }
  };

  setTotalBenchmarks(count: number): void {
    this.totalBenchmarks = count;
  }
}
