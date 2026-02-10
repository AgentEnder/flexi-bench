/**
 * Measure - Defines how benchmark iterations are measured.
 *
 * A Measure captures state before each iteration and calculates a result after.
 * This allows flexible measurement of different metrics (time, memory, etc.).
 *
 * Usage:
 *   benchmark.withMeasure(DurationMeasure)
 *   benchmark.withMeasure(MemoryMeasure.heapUsed)
 */

import { ResultType } from './results';

/**
 * Interface for defining custom measurements.
 *
 * @typeParam T - The type of state captured by start() and consumed by end()
 */
export interface Measure<T = unknown> {
  /**
   * Human-readable label for this measure, used in result output.
   */
  label: string;

  /**
   * The result type for formatting (time, size, or undefined for raw numbers).
   */
  type?: ResultType;

  /**
   * Capture state before each iteration.
   * Called immediately before the action runs.
   */
  start(): T;

  /**
   * Calculate the measured value after each iteration.
   * Called immediately after the action completes.
   *
   * @param state - The state returned by start()
   * @returns The measured value (e.g., elapsed ms, bytes delta)
   */
  end(state: T): number;
}

/**
 * Default measure that tracks execution duration in milliseconds.
 */
export const DurationMeasure: Measure<number> = {
  label: 'duration',
  type: 'time',
  start: () => performance.now(),
  end: (startTime) => performance.now() - startTime,
};

/**
 * Memory metrics available for measurement.
 */
export type MemoryMetric =
  | 'rss'
  | 'heapTotal'
  | 'heapUsed'
  | 'external'
  | 'arrayBuffers';

const MEMORY_LABELS: Record<MemoryMetric, string> = {
  rss: 'memory:rss',
  heapTotal: 'memory:heap_total',
  heapUsed: 'memory:heap_used',
  external: 'memory:external',
  arrayBuffers: 'memory:array_buffers',
};

/**
 * Creates a memory measure for a specific metric.
 *
 * @param metric - The memory metric to track
 * @returns A Measure that tracks the specified memory metric delta (clamped to 0)
 */
function createMemoryMeasure(metric: MemoryMetric): Measure<NodeJS.MemoryUsage> {
  return {
    label: MEMORY_LABELS[metric],
    type: 'size',
    start: () => process.memoryUsage(),
    // Clamp to 0: negative deltas occur when GC runs mid-iteration,
    // which is noise rather than meaningful measurement
    end: (baseline) => Math.max(0, process.memoryUsage()[metric] - baseline[metric]),
  };
}

/**
 * Memory measures for tracking different memory metrics.
 *
 * Each property is a Measure that tracks the delta of that metric
 * between the start and end of each iteration.
 *
 * @example
 * ```typescript
 * // Track heap memory usage
 * benchmark.withMeasure(MemoryMeasure.heapUsed)
 *
 * // Track RSS (total process memory)
 * benchmark.withMeasure(MemoryMeasure.rss)
 * ```
 */
export const MemoryMeasure = {
  /**
   * Resident Set Size - total memory allocated for the process.
   */
  rss: createMemoryMeasure('rss'),

  /**
   * Total V8 heap size.
   */
  heapTotal: createMemoryMeasure('heapTotal'),

  /**
   * Used V8 heap size.
   */
  heapUsed: createMemoryMeasure('heapUsed'),

  /**
   * Memory used by C++ objects bound to JavaScript.
   */
  external: createMemoryMeasure('external'),

  /**
   * Memory used by ArrayBuffers and SharedArrayBuffers.
   */
  arrayBuffers: createMemoryMeasure('arrayBuffers'),
} as const;

/**
 * Creates a custom measure.
 *
 * @example
 * ```typescript
 * const CounterMeasure = createMeasure({
 *   label: 'api_calls',
 *   start: () => getApiCallCount(),
 *   end: (startCount) => getApiCallCount() - startCount,
 * });
 * ```
 */
export function createMeasure<T>(options: Measure<T>): Measure<T> {
  return options;
}
