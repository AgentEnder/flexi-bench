import { BenchmarkConsoleReporter } from './reporters/benchmark-console-reporter';
import { Variation } from './variation';
import {
  TeardownMethod,
  SetupMethod,
  Action,
  BenchmarkReporter,
} from './api-types';
import { spawn } from 'child_process';
import { calculateResultsFromDurations, Result } from './results';
import {
  PerformanceObserverOptions,
  PerformanceWatcher,
} from './performance-observer';
import { BenchmarkBase } from './shared-api';

export class Benchmark extends BenchmarkBase {
  public variations: Variation[] = [];

  private iterations?: number;
  private timeout?: number;
  private reporter: BenchmarkReporter;
  private watcher?: PerformanceWatcher;

  constructor(
    public name: string,
    options?: {
      setup?: SetupMethod;
      teardown?: TeardownMethod;
      action?: Action;
      iterations?: number;
      timeout?: number;
      reporter?: BenchmarkReporter;
    },
  ) {
    super();
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
  ): this;
  withVariation(variation: Variation): this;
  withVariation(
    nameOrVariation: string | Variation,
    builder?: (variation: Variation) => Variation,
  ): this {
    if (nameOrVariation instanceof Variation) {
      this.variations.push(nameOrVariation);
    } else if (builder) {
      this.variations.push(builder(new Variation(nameOrVariation)));
      return this;
    } else {
      throw new Error(
        '`withVariation` must be called with either a Variation or a name and a builder function.',
      );
    }
    return this;
  }

  withVariations(variations: Variation[]): this {
    this.variations.push(...variations);
    return this;
  }

  withSetup(setup: SetupMethod): this {
    this.setupMethods.push(setup);
    return this;
  }

  withTeardown(teardown: TeardownMethod): this {
    this.teardownMethods.push(teardown);
    return this;
  }

  withAction(action: Action): this {
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

  withPerformanceObserver(options?: PerformanceObserverOptions): this {
    this.watcher = new PerformanceWatcher(options);
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
          for (const setup of this.setupEachMethods.concat(
            variation.setupEachMethods,
          )) {
            await setup(variation);
          }
          const a = performance.now();
          if (variation.action) {
            await runAction(variation.action, variation);
          } else if (this.action) {
            await runAction(this.action, variation);
          }
          const b = performance.now();
          for (const teardown of this.teardownEachMethods.concat(
            variation.teardownEachMethods,
          )) {
            await teardown(variation);
          }
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
      const result = calculateResultsFromDurations(variation.name, timings);

      // PerformanceObserver needs a chance to flush
      if (this.watcher) {
        const measures = await this.watcher.getMeasures();
        for (const key in measures) {
          result.subresults ??= [];
          result.subresults.push(
            calculateResultsFromDurations(key, measures[key]),
          );
        }
        this.watcher.clearMeasures();
      }
      results.push(result);
    }
    this.watcher?.disconnect();
    this.reporter.report(this, results);
    return results;
  }

  private validate() {
    if (!this.timeout && !this.iterations) {
      this.iterations = 5;
    }
    const missingActions = [];
    for (const variation of this.variations) {
      let action = variation.action || this.action;
      if (!action) {
        missingActions.push(variation.name);
        continue;
      }
      if (typeof action !== 'string' && variation.cliArgs.length > 0) {
        throw new Error(
          `Cannot use CLI args with a non-command action for ${this.name}:${variation.name}`,
        );
      }
    }
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

async function runAction(action: Action, variation: Variation) {
  if (typeof action === 'string') {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(action, variation.cliArgs, {
        shell: true,
        windowsHide: true,
      });
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(`Action failed with code ${code}`);
        }
      });
    });
  } else {
    return action(variation);
  }
}
