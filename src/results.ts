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
  raw: number[];

  /**
   * Subresults, if any. Typically sourced from performance observer.
   */
  subresults?: Result[];
};

export function calculateResultsFromDurations(
  label: string,
  durations: number[],
): Result {
  durations.sort((a, b) => a - b);
  return {
    label,
    min: Math.min(...durations),
    max: Math.max(...durations),
    average:
      durations.reduce((acc, duration) => acc + duration, 0) / durations.length,
    p95: durations[Math.floor(durations.length * 0.95)],
    raw: durations,
  };
}
