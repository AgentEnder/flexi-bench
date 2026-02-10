import { SetupMethod, TeardownMethod } from './api-types';
import { Benchmark } from './benchmark';
import { Measure } from './measure';
import { Suite } from './suite';
import { Lazy } from './utils/types';
import { Variation } from './variation';

const collectedLazys: Lazy<any>[] = [];

let activeSuite: Suite | null = null;

let runningStandaloneBenchmark: Promise<any> | null = null;
/**
 * Registers a new suite to run.
 * @param name The name of the suite.
 * @param fn Callback to register benchmarks and update the suite. Can be async.
 * @returns A lazy promise that runs the suite when consumed. `Record<string, Result[]>`
 */
export function suite(
  name: string,
  fn: (suite: Suite) => Suite | void | Promise<Suite | void>,
) {
  const s = new Suite(name);
  const lazy = new Lazy(async () => {
    const previousActiveSuite = activeSuite;
    activeSuite = s;
    const transformed = await fn(s);
    activeSuite = previousActiveSuite;
    const suiteToRun = transformed instanceof Suite ? transformed : s;
    return suiteToRun.run();
  });
  collectedLazys.push(lazy);
  return lazy;
}

let activeBenchmark: Benchmark | null = null;

/**
 * Registers a new benchmark to run. If inside a {@link suite} callback, it will be added to the suite. Otherwise, it will run immediately.
 * @param name The name of the benchmark.
 * @param fn Callback to register variations and update the benchmark. Can be async.
 * @returns If not inside a suite, a lazy promise for the benchmark results. `Result[]`. Else, a promise that resolves when setup is complete.
 */
export function benchmark(
  name: string,
  fn: (
    benchmark: Pick<Benchmark, Extract<keyof Benchmark, `with${string}`>>,
  ) => Benchmark | void | Promise<Benchmark | void>,
) {
  const b = new Benchmark(name);
  const capturedSuite = activeSuite;

  if (capturedSuite) {
    // In-suite: run the callback (may be async) then register the benchmark.
    // Returns a promise so the suite's Lazy executor can await it if needed.
    const setupPromise = (async () => {
      const previousActiveBenchmark = activeBenchmark;
      activeBenchmark = b;
      const transformed = await fn(b);
      activeBenchmark = previousActiveBenchmark;
      const benchmarkToUse =
        transformed instanceof Benchmark ? transformed : b;
      capturedSuite.addBenchmark(benchmarkToUse);
    })();
    return setupPromise;
  } else {
    // Standalone: return a Lazy that sets up and runs the benchmark.
    const previousRunning = runningStandaloneBenchmark;
    const lazy = new Lazy(async () => {
      const previousActiveBenchmark = activeBenchmark;
      activeBenchmark = b;
      const transformed = await fn(b);
      activeBenchmark = previousActiveBenchmark;
      const benchmarkToUse =
        transformed instanceof Benchmark ? transformed : b;

      if (previousRunning) {
        await previousRunning;
      }
      const runResult = await benchmarkToUse.run();
      runningStandaloneBenchmark = null;
      return runResult;
    });
    runningStandaloneBenchmark = lazy;
    collectedLazys.push(lazy);
    return lazy;
  }
}

let activeVariation: Variation | null = null;
/**
 * Registers a new variation to run. Must be inside a {@link benchmark} or {@link suite} callback.
 * @param name The name of the variation.
 * @param fn A callback to update the variation.
 * @returns `void`
 */
export function variation(
  name: string,
  fn: (variation: Variation) => Variation | void,
) {
  const v = new Variation(name);
  activeVariation = v;
  const transformed = fn(v);
  activeVariation = null;
  const variationToUse = transformed instanceof Variation ? transformed : v;
  if (activeBenchmark) {
    activeBenchmark.withVariation(variationToUse);
  } else if (activeSuite) {
    activeSuite.withVariation(variationToUse);
  } else {
    throw new Error('`variation` must be called within a benchmark or suite');
  }
}

/**
 * Registers a setup method to run before the benchmark or variation. Ran once per benchmark or variation.
 * @param fn The setup method.
 */
export function setup(fn: SetupMethod) {
  if (activeVariation) {
    activeVariation.withSetup(fn);
  } else if (activeBenchmark) {
    activeBenchmark.withSetup(fn);
  } else {
    throw new Error(
      '`beforeAll` must be called within a variation or benchmark',
    );
  }
}

/**
 * Registers a setup method to run before each iteration of the benchmark or variation.
 * @param fn The setup method.
 */
export function setupEach(fn: SetupMethod) {
  if (activeVariation) {
    activeVariation.withSetupEach(fn);
  } else if (activeBenchmark) {
    activeBenchmark.withSetupEach(fn);
  } else {
    throw new Error(
      '`beforeEach` must be called within a variation or benchmark',
    );
  }
}

/**
 * Registers a teardown method to run after the benchmark or variation. Ran once per benchmark or variation.
 * @param fn The teardown method.
 */
export function teardown(fn: TeardownMethod) {
  if (activeVariation) {
    activeVariation.withTeardown(fn);
  } else if (activeBenchmark) {
    activeBenchmark.withTeardown(fn);
  } else {
    throw new Error(
      '`afterAll` must be called within a variation or benchmark',
    );
  }
}

/**
 * Registers a teardown method to run after each iteration of the benchmark or variation.
 * @param fn The teardown method.
 */
export function teardownEach(fn: TeardownMethod) {
  if (activeVariation) {
    activeVariation.withTeardownEach(fn);
  } else if (activeBenchmark) {
    activeBenchmark.withTeardownEach(fn);
  } else {
    throw new Error(
      '`afterEach` must be called within a variation or benchmark',
    );
  }
}

/**
 * Sets the measure(s) to use for the current benchmark or suite.
 * Must be called within a benchmark or suite callback.
 *
 * When called within a suite, the measures apply to all benchmarks in the suite.
 * When called within a benchmark, the measures apply to that benchmark only
 * (overriding any suite-level measures).
 *
 * The first measure is the primary measure used for the main result.
 * Additional measures are tracked as subresults.
 *
 * @example
 * ```typescript
 * import { benchmark, suite, measure, DurationMeasure, MemoryMeasure } from 'flexi-bench';
 *
 * // Per-benchmark measure
 * benchmark('memory test', (b) => {
 *   measure(MemoryMeasure.heapUsed);
 *   b.withAction(() => allocateMemory());
 * });
 *
 * // Suite-wide measure
 * suite('memory suite', () => {
 *   measure(DurationMeasure, MemoryMeasure.heapUsed);
 *   benchmark('test1', (b) => { b.withAction(() => work()); });
 *   benchmark('test2', (b) => { b.withAction(() => moreWork()); });
 * });
 * ```
 *
 * @param measures One or more measures to use (e.g., DurationMeasure, MemoryMeasure.heapUsed)
 */
export function measure(first: Measure, ...rest: (Measure | Measure[])[]) {
  if (activeBenchmark) {
    activeBenchmark.withMeasure(first, ...rest);
  } else if (activeSuite) {
    activeSuite.withMeasure(first, ...rest);
  } else {
    throw new Error('`measure` must be called within a benchmark or suite');
  }
}

// ALIASES
// We provide some aliases for comfort when users are familiar with other testing tools.

/**
 * Alias for `setup`.
 */
export const beforeAll = setup;

/**
 * Alias for `setupEach`.
 */
export const beforeEach = setupEach;

/**
 * Alias for `teardown`.
 */
export const afterAll = teardown;

/**
 * Alias for `teardownEach`.
 */
export const afterEach = teardownEach;

/**
 * Alias for `suite`.
 */
export const describe = suite;

/**
 * Alias for `benchmark`.
 */
export const test = benchmark;

/**
 * Alias for `benchmark`.
 */
export const it = benchmark;

// DISABLED FUNCTIONS
export const xsuite: typeof suite = () => {
  return Promise.resolve({}) as any;
};
export const xdescribe = xsuite;

export const xbenchmark: typeof benchmark = () => {
  return Promise.resolve([]) as any;
};
export const xtest = xbenchmark;
export const xit = xbenchmark;

export const xvariation: typeof variation = () => {};

process.on('beforeExit', () => {
  const pending = collectedLazys.splice(0);
  if (pending.length > 0) {
    Promise.all(pending);
  }
});
