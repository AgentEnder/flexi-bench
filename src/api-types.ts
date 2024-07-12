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
