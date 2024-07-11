# FlexiBench

FlexiBench is a new benchmarking tool built with 2 main goals in mind:

- Ease of scripting.
- Ease of testing variations of the same benchmark.

In particular, we wanted to be able to test running Nx commands with different environment variables, different flags, etc. and compare the results.

## Installation

```bash
npm install --save-dev flexi-bench
```

## Usage

More detailed documentation will come soon. For now, here is a simple example:

```javascript
const { Benchmark } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: () => {
    // some action to benchmark
  },
});

await benchmark.run();
```

Most options for the benchmark can also be provided by a builder API:

```javascript
const { Benchmark } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark')
  .withIterations(10)
  .withSetup(() => {
    // some setup to run before the entire benchmark
  })
  .withAction(() => {
    // some action to benchmark
  });
```

### Suites

A suite is a collection of benchmarks that can be run together:

```javascript
const { Benchmark, Suite } = require('flexi-bench');

const suite = new Suite('My Suite')
  .addBenchmark(
    new Benchmark('My Benchmark 1', {
      iterations: 10,
      action: () => {
        // some action to benchmark
      },
    }),
  )
  .addBenchmark(
    new Benchmark('My Benchmark 2', {
      iterations: 10,
      action: () => {
        // some action to benchmark
      },
    }),
  );
```

### Variations

Variations allow running the same benchmark with different configurations:

```javascript
const { Benchmark, Variation } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: () => {
    // some action to benchmark
  },
}).withVariation('with NO_DAEMON', (v) =>
  v.withEnvironmentVariable('NO_DAEMON', 'true'),
);
```

Variations can do most things that the main benchmark can do, including having their own setup and teardown functions, or even a custom action.

Some helper functions are provided on the `Variation` class to make it easier to set up variations:

```javascript
const { Benchmark, Variation } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: () => {
    // some action to benchmark
  },
}).withVariations(
  // Adds 4 variations with all possible combinations of the given environment variables
  Variation.FromEnvironmentVariables([
    ['NO_DAEMON', ['true', 'false']],
    ['OTHER_VAR', ['value1', 'value2']],
  ]),
);
```

Variations can also be added to suites. Variations added to a suite will be applied to all benchmarks in the suite.

For example, the below suite would run each benchmark with 'NO_DAEMON' set to true, and then with 'OTHER_VAR' set to 'value1' for a total of 4 benchmark runs in the suite:

```javascript
const { Benchmark, Suite, Variation } = require('flexi-bench');

const suite = new Suite('My Suite')
  .addBenchmark(
    new Benchmark('My Benchmark 1', {
      iterations: 10,
      action: () => {
        // some action to benchmark
      },
    }),
  )
  .addBenchmark(
    new Benchmark('My Benchmark 2', {
      iterations: 10,
      action: () => {
        // some action to benchmark
      },
    }),
  )
  .withVariation('with NO_DAEMON', (v) =>
    v.withEnvironmentVariable('NO_DAEMON', 'true'),
  )
  .withVariation('with OTHER_VAR', (v) =>
    v.withEnvironmentVariable('OTHER_VAR', 'value1'),
  );
```

## Examples

- See ./benchmark.ts for the motivating example of running Nx commands with different environment variables.
