export type Result = {
  label: string;
  min: number;
  max: number;
  average: number;
  p95: number;
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
  };
}
