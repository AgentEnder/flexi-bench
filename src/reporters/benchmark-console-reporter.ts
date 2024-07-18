import { BenchmarkReporter, ProgressContext } from '../api-types';
import { Benchmark } from '../benchmark';

import { SingleBar } from 'cli-progress';
import { Result } from '../results';

export class BenchmarkConsoleReporter implements BenchmarkReporter {
  public bar = new SingleBar({
    format:
      'Running variation {label}: {bar} {percentage}% | {value}/{total} - ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    stopOnComplete: true,
    clearOnComplete: true,
  });

  constructor() {}

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
