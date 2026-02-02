import { BenchmarkReporter, ProgressContext } from '../api-types';
import { Benchmark } from '../benchmark';

import { SingleBar } from 'cli-progress';
import { Result } from '../results';

function getNoColorOption(explicitNoColor?: boolean): boolean {
  if (explicitNoColor !== undefined) {
    return explicitNoColor;
  }
  return process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';
}

export class BenchmarkConsoleReporter implements BenchmarkReporter {
  private noColor: boolean;
  public bar: SingleBar;

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

  progress(name: string, percent: number, context: ProgressContext) {
    if (!this.bar.isActive) {
      this.bar.start(context.totalIterations ?? 100, 0);
    }
    this.bar.update(context.completedIterations, { label: name });
  }

  report(benchmark: Benchmark, results: Result[]) {
    const tableEntries = results.map(({ raw, ...rest }) => ({
      ...rest,
    }));
    console.log(`Benchmark: ${benchmark.name}`);
    console.table(tableEntries);
  }
}
