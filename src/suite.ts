import { BenchmarkReporter, SuiteReporter } from './api-types';
import { Benchmark } from './benchmark';
import { SuiteConsoleReporter } from './reporters/suite-console-reporter';
import { Result } from './results';
import { Variation } from './variation';

export interface SuiteOptions {
  reporter?: SuiteReporter;
}

export class Suite {
  private benchmarks: Benchmark[] = [];
  private variations: Variation[] = [];

  private reporter: SuiteReporter;
  private benchmarkReporter?: BenchmarkReporter;

  constructor(
    private name: string,
    options?: SuiteOptions,
  ) {
    this.name = name;
    this.benchmarks = [];
    this.reporter = options?.reporter || new SuiteConsoleReporter();
  }

  addBenchmark(benchmark: Benchmark) {
    this.benchmarks.push(benchmark);
    return this;
  }

  withVariation(variation: Variation) {
    this.variations.push(variation);
    return this;
  }

  withVariations(variations: Variation[]) {
    this.variations.push(...variations);
    return this;
  }

  withReporter(reporter: SuiteReporter) {
    this.reporter = reporter;
    return this;
  }

  withBenchmarkReporter(reporter: BenchmarkReporter) {
    this.benchmarkReporter = reporter;
    return this;
  }

  async run() {
    const results: Record<string, Result[]> = {};
    for (const benchmark of this.benchmarks) {
      benchmark.withVariations(this.variations);
      if (this.benchmarkReporter) {
        benchmark.withReporter(this.benchmarkReporter);
      }
      results[benchmark.name] = await benchmark.run();
    }
    this.reporter.report(results);
    return results;
  }
}
