import { Result, Reporter, ProgressContext } from './api-types';
import { Benchmark } from './benchmark';

import { SingleBar } from 'cli-progress';

export class ConsoleReporter implements Reporter {
  private bar = new SingleBar({
    format:
      'Running: {label}\n{bar} {percentage}% | {value}/{total} - ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  constructor() {}

  progress(name: string, percent: number, context: ProgressContext) {
    if (!this.bar.isActive) {
      this.bar.start(context.totalIterations ?? 100, 0);
    }
    this.bar.update(context.completedIterations, { label: name });
    process.stdout.moveCursor(0, -1);
    // console.log(`Progress: ${name} ${Math.round(percent * 10000) / 100}%`);
  }

  report(benchmark: Benchmark, results: Result[]) {
    this.bar.stop();
    process.stdout.moveCursor(0, -1);
    process.stdout.clearScreenDown();
    console.log(`Benchmark: ${benchmark.name}`);
    console.table(results);
  }
}
