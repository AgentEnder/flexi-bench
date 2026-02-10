import { BenchmarkReporter, ProgressContext } from '../api-types';
import { Benchmark } from '../benchmark';

import { SingleBar } from 'cli-progress';
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

export class BenchmarkConsoleReporter implements BenchmarkReporter {
  private noColor: boolean;
  public bar: SingleBar;

  private inAltScreen: boolean = false;
  private currentVariation: string = '';
  private currentProgress: number = 0;
  private currentContext?: ProgressContext;
  private unsubscribeResize?: () => void;
  private lastRenderedProgress: number = -1;
  private dashboardInitialized: boolean = false;
  private dashboardLineCount: number = 0;

  constructor(opts?: { noColor?: boolean }) {
    this.noColor = getNoColorOption(opts?.noColor);
    this.bar = new SingleBar({
      format: this.noColor
        ? 'Running variation {label}: [{bar}] {percentage}% | {value}/{total} - ETA: {eta}s'
        : 'Running variation {label}: {bar} {percentage}% | {value}/{total} - ETA: {eta}s',
      barCompleteChar: this.noColor ? '#' : '\u2588',
      barIncompleteChar: this.noColor ? '-' : '\u2591',
      hideCursor: true,
      stopOnComplete: true,
      clearOnComplete: true,
    });
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

    const progressInt = Math.floor(this.currentProgress * 10);

    if (
      !this.dashboardInitialized ||
      progressInt !== this.lastRenderedProgress
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
        ? `Benchmark: ${this.currentVariation}`
        : `${ANSI.BOLD}Benchmark: ${this.currentVariation}${ANSI.RESET}`;
      process.stdout.write(`${title}\n\n`);

      const percentage = Math.floor(this.currentProgress * 100);
      const barWidth = Math.min(width - 20, 50);
      const filled = Math.floor((percentage / 100) * barWidth);
      const empty = barWidth - filled;
      const barChar = this.noColor ? '#' : '\u2588';
      const emptyChar = this.noColor ? '-' : '\u2591';

      const bar = `${barChar.repeat(filled)}${emptyChar.repeat(empty)}`;
      const status = this.noColor
        ? `${bar} ${percentage}%`
        : `${ANSI.GREEN}${bar}${ANSI.RESET} ${percentage}%`;

      process.stdout.write(`  Progress: ${status}\n`);

      this.dashboardLineCount = 3;

      if (this.currentContext) {
        const { completedIterations, totalIterations, timeElapsed } =
          this.currentContext;

        if (totalIterations) {
          process.stdout.write(
            `  Iterations: ${completedIterations} / ${totalIterations}\n`,
          );
        } else {
          process.stdout.write(`  Iterations: ${completedIterations}\n`);
        }

        const elapsed = (timeElapsed / 1000).toFixed(1);
        process.stdout.write(`  Elapsed: ${elapsed}s\n`);

        this.dashboardLineCount = 5;

        if (totalIterations && completedIterations > 0 && timeElapsed > 0) {
          const avgTimePerIteration = timeElapsed / completedIterations;
          const remainingIterations = totalIterations - completedIterations;
          const eta = (
            (avgTimePerIteration * remainingIterations) /
            1000
          ).toFixed(1);
          process.stdout.write(`  ETA: ${eta}s`);
          this.dashboardLineCount = 6;
        }
      }

      this.dashboardInitialized = true;
      this.lastRenderedProgress = progressInt;
    }
  }

  progress(name: string, percent: number, context: ProgressContext) {
    this.enterAltScreen();

    this.currentVariation = name;
    this.currentProgress = percent;
    this.currentContext = context;

    if (!this.bar.isActive) {
      this.bar.start(context.totalIterations ?? 100, 0);
    }
    this.bar.update(context.completedIterations, { label: name });

    if (this.inAltScreen) {
      this.renderDashboard();
    }
  }

  report(benchmark: Benchmark, results: Result[]) {
    this.exitAltScreen();

    renderResults(benchmark.name, results, this.noColor);
  }
}
