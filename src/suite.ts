import { SuiteReporter } from './api-types';
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

  addVariation(variation: Variation) {
    this.variations.push(variation);
    return this;
  }

  addVariations(variations: Variation[]) {
    this.variations.push(...variations);
    return this;
  }

  async run() {
    const results: Record<string, Result[]> = {};
    for (const benchmark of this.benchmarks) {
      benchmark.withVariations(this.variations);
      results[benchmark.name] = await benchmark.run();
    }
    this.reporter.report(results);
  }
}
