import { BenchmarkConsoleReporter } from './benchmark-console-reporter';
import { Variation } from './variation';
import { BenchmarkReporter, Result } from './api-types';
import { ActionMethod } from './api-types';
import { TeardownMethod } from './api-types';
import { SetupMethod } from './api-types';

export class Benchmark {
  private setupMethods: SetupMethod[] = [];
  private teardownMethods: TeardownMethod[] = [];
  private action?: ActionMethod;

  public variations: Variation[] = [];

  private iterations?: number;
  private timeout?: number;
  private reporter: BenchmarkReporter;

  constructor(
    public name: string,
    options?: {
      setup?: SetupMethod;
      teardown?: TeardownMethod;
      action?: ActionMethod;
      iterations?: number;
      timeout?: number;
      reporter?: BenchmarkReporter;
    },
  ) {
    if (options?.action) {
      this.action = options.action;
    }
    if (options?.setup) {
      this.setupMethods.push(options.setup);
    }
    if (options?.teardown) {
      this.teardownMethods.push(options.teardown);
    }
    if (options?.iterations) {
      this.iterations = options.iterations;
    }
    if (options?.timeout) {
      this.timeout = options.timeout;
    }
    this.reporter = options?.reporter || new BenchmarkConsoleReporter();
  }

  withVariation(
    name: string,
    builder: (variation: Variation) => Variation,
  ): this {
    this.variations.push(builder(new Variation(name)));
    return this;
  }

  withVariations(variations: Variation[]): this {
    this.variations.push(...variations);
    return this;
  }

  withSetup(setup: () => void): this {
    this.setupMethods.push(setup);
    return this;
  }

  withTeardown(teardown: () => void): this {
    this.teardownMethods.push(teardown);
    return this;
  }

  withAction(action: () => void): this {
    this.action = action;
    return this;
  }

  withIterations(iterations: number): this {
    this.iterations = iterations;
    return this;
  }

  withTimeout(timeout: number): this {
    this.timeout = timeout;
    return this;
  }

  withReporter(reporter: BenchmarkReporter): this {
    this.reporter = reporter;
    return this;
  }

  async run() {
    this.validate();

    let results: Result[] = [];

    if (this.variations.length === 0) {
      this.variations.push(new Variation('default'));
    }
    const totalIterations = this.iterations
      ? this.variations.length * this.iterations
      : undefined;

    const startTime = performance.now();
    let totalCompletedIterations = 0;

    for (
      let variationIndex = 0;
      variationIndex < this.variations.length;
      variationIndex++
    ) {
      const variation = this.variations[variationIndex];
      const timings: number[] = [];
      // SETUP
      const oldEnv = { ...process.env };
      process.env = {
        ...process.env,
        ...variation.environment,
      };
      for (const setup of this.setupMethods) {
        await setup(variation);
      }
      for (const setup of variation.setupMethods) {
        await setup(variation);
      }
      // ACT
      const benchmarkThis = this;
      await new Promise<void>(async (resolve, reject) => {
        let completedIterations = 0;
        let timeout = benchmarkThis.timeout
          ? setTimeout(() => {
              running = false;
              if (
                benchmarkThis?.iterations &&
                completedIterations < benchmarkThis.iterations
              ) {
                reject('Timeout');
              }
              resolve();
            }, benchmarkThis.timeout)
          : null;
        let running = true;
        while (running) {
          const a = performance.now();
          if (variation.action) {
            await variation.action(variation);
          } else if (this.action) {
            await this.action(variation);
          }
          const b = performance.now();
          const duration = b - a;
          completedIterations++;
          totalCompletedIterations++;
          timings.push(duration);
          if (
            this.reporter.progress &&
            totalIterations &&
            benchmarkThis.iterations
          ) {
            this.reporter.progress(
              variation.name,
              totalCompletedIterations / totalIterations,
              {
                timeElapsed: performance.now() - startTime,
                totalIterations,
                completedIterations: totalCompletedIterations,
                timeout: benchmarkThis.timeout,
              },
            );
          }

          if (
            benchmarkThis?.iterations &&
            completedIterations >= benchmarkThis.iterations
          ) {
            running = false;
            if (timeout) {
              clearTimeout(timeout);
            }
            resolve();
          }
        }
      });
      if (this.reporter.progress && !totalIterations) {
        this.reporter.progress(
          variation.name,
          variationIndex / this.variations.length,
          {
            timeElapsed: performance.now() - startTime,
            timeout: this.timeout,
            completedIterations: totalCompletedIterations,
          },
        );
      }

      // TEARDOWN
      for (const teardown of variation.teardownMethods) {
        await teardown(variation);
      }
      for (const teardown of this.teardownMethods) {
        await teardown(variation);
      }
      process.env = oldEnv;

      // REPORT
      const min = Math.min(...timings);
      const max = Math.max(...timings);
      const sum = timings.reduce((a, b) => a + b, 0);
      const average = sum / timings.length;
      const sortedTimings = [...timings].sort((a, b) => a - b);
      const p95 = sortedTimings[Math.floor(sortedTimings.length * 0.95)];
      results.push({
        label: variation.name,
        min,
        max,
        average,
        p95,
      });
    }

    this.reporter.report(this, results);
    return results;
  }

  private validate() {
    if (!this.action) {
      const missingActions = this.variations.filter((v) => !v.action);
      if (missingActions.length > 0) {
        throw new Error(
          `Missing action for variations: ${missingActions
            .map((v) => v.name)
            .join(', ')}`,
        );
      } else {
        throw new Error(`Benchmark ${this.name} is missing an action`);
      }
    }
  }
}
