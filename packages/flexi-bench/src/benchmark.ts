import { spawn } from 'child_process';
import {
  Action,
  AggregateBenchmarkError,
  BenchmarkReporter,
  ErrorStrategy,
  SetupMethod,
  TeardownMethod,
} from './api-types';
import { DurationMeasure, Measure } from './measure';
import {
  PerformanceObserverOptions,
  PerformanceWatcher,
} from './performance-observer';
import { BenchmarkConsoleReporter } from './reporters/benchmark-console-reporter';
import { blackhole } from './blackhole';
import { calculateResultsFromDurations, Result } from './results';
import { BenchmarkBase } from './shared-api';
import { Variation } from './variation';

export class Benchmark extends BenchmarkBase {
  public variations: Variation[] = [];

  private iterations?: number;
  private timeout?: number;
  private reporter: BenchmarkReporter;
  private watcher?: PerformanceWatcher;
  private measures: Measure<unknown>[] = [DurationMeasure];

  public errorStrategy: ErrorStrategy = ErrorStrategy.Continue;

  constructor(
    public name: string,
    options?: {
      setup?: SetupMethod;
      teardown?: TeardownMethod;
      action?: Action;
      iterations?: number;
      warmupIterations?: number;
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
    if (options?.warmupIterations !== undefined) {
      this.warmupIterations = options.warmupIterations;
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

  withWarmupIterations(warmupIterations: number): this {
    this.warmupIterations = warmupIterations;
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

  /**
   * Set the measure(s) to use for this benchmark.
   * Defaults to DurationMeasure (time-based measurement).
   *
   * The first measure is the primary measure used for the main result.
   * Additional measures are tracked as subresults.
   *
   * @example
   * ```typescript
   * // Measure memory instead of time
   * benchmark.withMeasure(MemoryMeasure.heapUsed)
   *
   * // Measure both duration and memory
   * benchmark.withMeasure(DurationMeasure, MemoryMeasure.heapUsed)
   * ```
   */
  withMeasure(...measures: [Measure, ...(Measure | Measure[])[]]): this {
    this.measures = measures.flat();
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
      const variationStartTime = performance.now();
      const iterationResults: (number | Error)[][] = this.measures.map(
        () => [],
      );
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
        const warmupIterations =
          variation.warmupIterations ?? this.warmupIterations ?? 0;

        for (let i = 0; i < warmupIterations; i++) {
          for (const setup of this.setupEachMethods.concat(
            variation.setupEachMethods,
          )) {
            await setup(variation);
          }
          const warmupError = await this.runWarmupAction(variation);
          if (warmupError) {
            reject(warmupError);
            return;
          }
          for (const teardown of this.teardownEachMethods.concat(
            variation.teardownEachMethods,
          )) {
            await teardown(variation);
          }
        }

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
          const measureResults = await this.runAndMeasureAction(variation);
          const errorStrategy =
            variation.errorStrategy ?? benchmarkThis.errorStrategy;
          if (
            errorStrategy === ErrorStrategy.Abort &&
            measureResults[0] instanceof Error
          ) {
            reject(measureResults[0]);
            return;
          }
          for (const teardown of this.teardownEachMethods.concat(
            variation.teardownEachMethods,
          )) {
            await teardown(variation);
          }

          completedIterations++;
          totalCompletedIterations++;
          for (let i = 0; i < measureResults.length; i++) {
            iterationResults[i].push(measureResults[i]);
          }
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
      const variationEndTime = performance.now();
      const primaryResults = iterationResults[0];
      const result = calculateResultsFromDurations(
        variation.name,
        primaryResults,
        {
          type: this.measures[0].type,
          iterations: primaryResults.length,
          totalDuration: variationEndTime - variationStartTime,
          benchmarkName: this.name,
          variationName: variation.name,
        },
      );

      // Additional measures become subresults
      for (let i = 1; i < this.measures.length; i++) {
        result.subresults ??= [];
        result.subresults.push(
          calculateResultsFromDurations(
            this.measures[i].label,
            iterationResults[i],
            {
              type: this.measures[i].type,
              benchmarkName: this.name,
              variationName: variation.name,
            },
          ),
        );
      }

      // PerformanceObserver needs a chance to flush
      if (this.watcher) {
        const measures = await this.watcher.getMeasures();
        for (const key in measures) {
          result.subresults ??= [];
          result.subresults.push(
            calculateResultsFromDurations(key, measures[key], {
              type: 'time',
              benchmarkName: this.name,
              variationName: variation.name,
            }),
          );
        }
        this.watcher.clearMeasures();
      }

      results.push(result);
    }
    this.watcher?.disconnect();
    this.reporter.report(this, results);
    if (
      this.errorStrategy === ErrorStrategy.DelayedThrow &&
      results.some((r) => r.failed)
    ) {
      throw new AggregateBenchmarkError(results);
    }
    return results;
  }

  private async runAndMeasureAction(
    variation: Variation,
  ): Promise<(number | Error)[]> {
    try {
      const states = this.measures.map((m) => m.start());
      await this.runActionWithBlackhole(variation);
      return this.measures.map((m, i) => m.end(states[i]));
    } catch (e) {
      const error =
        e instanceof Error ? e : new Error('Unknown error during action.');
      return this.measures.map(() => error);
    }
  }

  private async runWarmupAction(variation: Variation): Promise<Error | void> {
    try {
      await this.runActionWithBlackhole(variation);
    } catch (e) {
      return e instanceof Error
        ? e
        : new Error('Unknown error during warmup action.');
    }
  }

  private async runActionWithBlackhole(variation: Variation): Promise<void> {
    const actionResult = await runAction(
      (variation.action ?? this.action)!,
      variation,
    );
    blackhole(actionResult);
  }

  private validate() {
    if (!this.timeout && !this.iterations) {
      this.iterations = 5;
    }
    if (
      this.warmupIterations !== undefined &&
      (!Number.isInteger(this.warmupIterations) || this.warmupIterations < 0)
    ) {
      throw new Error(
        `Warmup iterations for benchmark "${this.name}" must be a non-negative integer.`,
      );
    }
    const missingActions = [];
    for (const variation of this.variations) {
      let action = variation.action || this.action;
      if (!action) {
        missingActions.push(variation.name);
        continue;
      }
      if (
        variation.warmupIterations !== undefined &&
        (!Number.isInteger(variation.warmupIterations) ||
          variation.warmupIterations < 0)
      ) {
        throw new Error(
          `Warmup iterations for variation "${variation.name}" in benchmark "${this.name}" must be a non-negative integer.`,
        );
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

async function runAction(
  action: Action,
  variation: Variation,
): Promise<unknown> {
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
