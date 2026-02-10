import { spawn } from 'child_process';
import isCi from 'is-ci';

export type GitInfo = {
  head: string;
  sha: string;
  dirty: boolean;
};

/**
 * The type of measurement, which determines formatting.
 * - 'time': Formatted as ms, s, m, h (e.g., "120.5 ms", "1.2 s")
 * - 'size': Formatted as B, KB, MB, GB (e.g., "86.4 MB", "1.2 GB")
 * - undefined: Raw numbers with no unit conversion
 */
export type ResultType = 'time' | 'size';

/**
 * A measurement result.
 */
export type Result = {
  /**
   * The label of the result. Typically the name of the benchmark or variation.
   */
  label: string;

  /**
   * The type of measurement (time, size, or raw number if undefined).
   * Determines how values are formatted in reports.
   */
  type?: ResultType;

  /**
   * The minimum value.
   */
  min: number;

  /**
   * The maximum value.
   */
  max: number;

  /**
   * The average value.
   */
  average: number;

  /**
   * The 95th percentile value.
   */
  p95: number;

  /**
   * The raw durations, in order. Used for custom reporters.
   */
  raw: (number | Error)[];

  /**
   * Whether any run of the benchmark failed.
   */
  failed?: boolean;

  /**
   * The rate of failure, if any.
   */
  failureRate?: number;

  /**
   * Subresults, if any. Typically sourced from performance observer.
   */
  subresults?: Result[];

  /**
   * The number of iterations that were run.
   */
  iterations?: number;

  /**
   * The total wall-clock duration for all iterations in milliseconds.
   */
  totalDuration?: number;

  /**
   * The name of the benchmark that produced this result.
   */
  benchmarkName?: string;

  /**
   * The name of the variation that produced this result.
   */
  variationName?: string;

  /**
   * Git information about the repository state when this result was produced.
   */
  git?: GitInfo;
};

let cachedGitInfo: GitInfo | undefined | null = null;
export function getGitInfo(): GitInfo | undefined {
  if (cachedGitInfo !== null) {
    return cachedGitInfo;
  }

  if (!isCi) {
    cachedGitInfo = undefined;
    return undefined;
  }

  const getGitOutput = (args: string[]): string => {
    try {
      const result = spawn('git', args, {
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      let output = '';
      result.stdout?.on('data', (data) => {
        output += data.toString();
      });
      result.stdout?.on('end', () => {
        return output.trim();
      });
      return output.trim();
    } catch {
      return '';
    }
  };

  const head = getGitOutput(['rev-parse', '--abbrev-ref', 'HEAD']);
  const sha = getGitOutput(['rev-parse', 'HEAD']);
  const dirty = getGitOutput(['status', '--porcelain']).length > 0;

  cachedGitInfo = {
    head,
    sha,
    dirty,
  };
  return cachedGitInfo;
}

export function calculateResultsFromDurations(
  label: string,
  durations: (number | Error)[],
  metadata?: {
    type?: ResultType;
    iterations?: number;
    totalDuration?: number;
    benchmarkName?: string;
    variationName?: string;
  },
): Result {
  const errors: Error[] = [];
  const results: number[] = [];

  for (const duration of durations) {
    if (duration instanceof Error) {
      errors.push(duration);
    } else {
      results.push(duration);
    }
  }

  results.sort((a, b) => a - b);
  return {
    label,
    min: Math.min(...results),
    max: Math.max(...results),
    average:
      results.reduce((acc, duration) => acc + duration, 0) / results.length,
    p95: results[Math.floor(results.length * 0.95)],
    raw: durations,
    failed: errors.length > 0,
    failureRate: errors.length / durations.length,
    ...metadata,
    ...(getGitInfo() ? { git: getGitInfo() } : {}),
  };
}
