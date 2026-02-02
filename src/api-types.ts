import { Variation } from './variation';

import { Benchmark } from './benchmark';
import { Result } from './results';

export type MaybePromise<T> = T | Promise<T>;
export type SetupMethod = (variation: Variation) => MaybePromise<void>;
export type TeardownMethod = (variation: Variation) => MaybePromise<void>;

export type ActionMethod = (variation: Variation) => MaybePromise<void>;
export type ActionCommand = string;
export type Action = ActionMethod | ActionCommand;

export type EnvironmentVariableOptions =
  | readonly (readonly [key: string, values: readonly string[]])[]
  | [key: string, values: string[]][];

export interface ProgressContext {
  totalIterations?: number;
  completedIterations: number;
  timeout?: number;
  timeElapsed: number;
}

export interface BenchmarkReporter {
  progress?: (name: string, progress: number, context: ProgressContext) => void;
  report: (benchmark: Benchmark, results: Result[]) => void;
}

export interface SuiteReporter {
  /**
   * Called before the suite starts running.
   * @param suiteName - The name of the suite
   */
  onSuiteStart?: (suiteName: string) => void;

  /**
   * Called before each benchmark starts.
   * @param benchmarkName - The name of the benchmark
   */
  onBenchmarkStart?: (benchmarkName: string) => void;

  /**
   * Called after each benchmark completes.
   * @param benchmarkName - The name of the benchmark
   * @param results - The results for the benchmark
   */
  onBenchmarkEnd?: (benchmarkName: string, results: Result[]) => void;

  /**
   * Sets the total number of benchmarks in the suite.
   * @param count - The total number of benchmarks
   */
  setTotalBenchmarks?: (count: number) => void;

  /**
   * Called after all benchmarks complete.
   * @param results - All benchmark results keyed by benchmark name
   */
  report: (results: Record<string, Result[]>) => void;
}

/**
 * The strategy to use when an error occurs during a benchmark run.
 */
export enum ErrorStrategy {
  /**
   * Continue running the benchmark. Errors will be collected and reported at the end. This is the default behavior.
   */
  Continue = 'continue',

  /**
   * Abort the benchmark run immediately when an error occurs.
   */
  Abort = 'abort',

  /**
   * Delay the error until the end of the benchmark run. This is useful when you want to see all the errors at once
   */
  DelayedThrow = 'delayed-throw',
}

export class AggregateBenchmarkError extends Error {
  constructor(public results: Result[]) {
    super(
      '[AggregateBenchmarkError]: One or more benchmarks failed. Check the results for more information.',
    );
  }
}

export class AggregateSuiteError extends Error {
  constructor(public results: Record<string, Result[]>) {
    super(
      '[AggregateSuiteError]: One or more benchmarks failed. Check the results for more information.',
    );
  }
}
