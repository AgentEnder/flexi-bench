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
