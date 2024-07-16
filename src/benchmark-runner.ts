import { SetupMethod, TeardownMethod } from './api-types';
import { Benchmark } from './benchmark';
import { BenchmarkBase } from './shared-api';
import { Suite } from './suite';
import { Variation } from './variation';

let activeSuite: Suite | null = null;
/**
 * Registers a new suite to run.
 * @param name The name of the suite.
 * @param fn Callback to register benchmarks and update the suite.
 * @returns The results of the suite. `Record<string, Result[]>`
 */
export function suite(name: string, fn: (suite: Suite) => Suite | void) {
  const suite = new Suite(name);
  activeSuite = suite;
  const transformed = fn(suite);
  activeSuite = null;
  return (transformed ?? suite).run();
}

let activeBenchmark: Benchmark | null = null;

/**
 * Registers a new benchmark to run. If inside a {@link suite} callback, it will be added to the suite. Otherwise, it will run immediately.
 * @param name The name of the benchmark.
 * @param fn Callback to register variations and update the benchmark.
 * @returns If not inside a suite, the results of the benchmark. `Result[]`. Else, `void`.
 */
export function benchmark(
  name: string,
  fn: (
    benchmark: Pick<Benchmark, Extract<keyof Benchmark, `with${string}`>>,
  ) => Benchmark | void,
) {
  const benchmark = new Benchmark(name);
  activeBenchmark = benchmark;
  const transformed = fn(benchmark);
  activeBenchmark = null;
  if (activeSuite) {
    activeSuite.addBenchmark(transformed ?? benchmark);
  } else {
    return (transformed ?? benchmark).run();
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
  const variation = new Variation(name);
  activeVariation = variation;
  const transformed = fn(variation);
  activeVariation = null;
  if (activeBenchmark) {
    activeBenchmark.withVariation(transformed ?? variation);
  } else if (activeSuite) {
    activeSuite.withVariation(transformed ?? variation);
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
  return Promise.resolve({});
};
export const xdescribe = xsuite;

export const xbenchmark: typeof benchmark = () => {
  return Promise.resolve([]);
};
export const xtest = xbenchmark;
export const xit = xbenchmark;

export const xvariation: typeof variation = () => {};
