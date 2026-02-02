/**
 * A measurement result.
 */
export type Result = {
  /**
   * The label of the result. Typically the name of the benchmark or variation.
   */
  label: string;

  /**
   * The minimum duration.
   */
  min: number;

  /**
   * The maximum duration.
   */
  max: number;

  /**
   * The average duration.
   */
  average: number;

  /**
   * The 95th percentile duration.
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
};

export function calculateResultsFromDurations(
  label: string,
  durations: (number | Error)[],
  metadata?: {
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
  };
}
