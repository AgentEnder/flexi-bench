# FlexiBench

FlexiBench is a flexible benchmarking library for JavaScript and TypeScript. It is designed to be simple to use, but also powerful and flexible. It is inspired by common testing framework APIs, and aims to provide a similar experience for benchmarking.

## Installation

```bash
npm install --save-dev flexi-bench
```

```bash
yarn add --dev flexi-bench
```

```bash
pnpm add --save-dev flexi-bench
```

## Features

- [Variations](#variations): Run the same benchmark with different configurations.
- [Setup and Teardown](#setup-and-teardown): Run setup and teardown code before and after the benchmark.
- [Commands](#commands): Run simple commands as benchmarks.

## Usage

### Runner API

The runner API is the simplest way to run benchmarks. It allows running a single benchmark or a suite of benchmarks.

```javascript
const { suite, benchmark, setup, teardown } = require('flexi-bench');

// A `suite` call at the top level will be evaluated as a whole suite.
suite('My Suite', () => {
  // Nested `benchmark` calls will not be evaluated until the parent `suite` is evaluated.
  benchmark('My Benchmark', (b) => {
    setup(() => {
      // some setup to run before the entire benchmark
    });

    teardown(() => {
      // some teardown to run after the entire benchmark
    });

    b.withAction(() => {
      // some action to benchmark
    });
  });
});

// Top-level `benchmark` calls will be evaluated immediately.
benchmark('My Benchmark', (b) => {
  b.withIterations(10).withAction(() => {
    // some action to benchmark
  });
});
```

Within the callbacks for each `suite` or `benchmark` you can utilize the builder API for full customization of the benchmark. Variations can either be added directly via the builder API, or by nesting a `variation` call within the `benchmark` call, or at the `suite` level to apply the variation to all benchmarks in the suite.

```javascript
const { suite, benchmark, variation } = require('flexi-bench');

suite('My Suite', () => {
  benchmark('My Benchmark', (b) => {
    b.withIterations(10).withAction(() => {
      // some action to benchmark
    });

    variation('with NO_DAEMON', (v) =>
      v.withEnvironmentVariable('NO_DAEMON', 'true'),
    );
  });
});
```

### Basic Benchmarks

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

#### Setup and Teardown

Some benchmarks will require some work before the benchmark to setup the environment, and some work after the benchmark to clean up. This can be done with the `setup`/`setupEach` and `teardown`/`teardownEach` methods:

```javascript
benchmark('My Benchmark', (b) => {
  setup(() => {
    // some setup to run before the entire benchmark
  });

  setupEach(() => {
    // some setup that is ran before each iteration of the benchmark
  });

  teardown(() => {
    // some teardown to run after the entire benchmark
  });

  teardownEach(() => {
    // some teardown that is ran after each iteration of the benchmark
  });
});
```

These can also be set using the builder API:

```javascript
const { Benchmark } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark')
  .withIterations(10)
  .withSetup(() => {
    // some setup to run before the entire benchmark
  })
  .withSetupEach(() => {
    // some setup that is ran before each iteration of the benchmark
  })
  .withTeardown(() => {
    // some teardown to run after the entire benchmark
  })
  .withTeardownEach(() => {
    // some teardown that is ran after each iteration of the benchmark
  });
```

#### Understanding Actions

The `action` for a benchmark provides the actual event that is being benchmarked. FlexiBench can currently benchmark 2 types of actions:

- Callbacks
- Commands

An `action` can be specified via the `action` property of the `benchmark` or `variation` constructor, or via `.withAction` on the builder API. Actions specified on the running `variation` will override the action specified on the parent `benchmark`.

For example, the following code will run the `action` specified on the `variation`, and not the `action` specified on the `benchmark`. This would result in the output `bar` being printed 10 times, instead of `foo`:

```javascript
const { Benchmark } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: () => {
    console.log('foo');
  },
}).withVariation('with NO_DAEMON', (v) =>
  v.withAction(() => {
    console.log('bar');
  }),
);
```

##### Callbacks

If the process you are benchmarking is available as a JavaScript function, you can pass it directly to the `action` property or execute it within the `action` callback. For example, if you are benchmarking a function that sorts an array, you can do the following:

```javascript
const { benchmark, setup } = require('flexi-bench');

benchmark('My Benchmark', (b) => {
  let array;

  setup(() => {
    array = Array.from({ length: 1000 }, () => Math.random());
  });

  b.withIterations(10).withAction(() => {
    array.sort();
  });
});
```

##### Commands

If the process you are benchmarking is not available as a JavaScript function, you can run it as a command. This can be done by passing a string to the `action` property. For example, if you are benchmarking the runtime of a cli command, you can do the following:

```javascript
const { Benchmark } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: 'echo "Hello, World!"',
});

await benchmark.run();
```

While it would be possible to write an action that runs a command using `child_process` methods, using the syntactic sugar provided by flexi-bench is more convenient and provides a few benefits.

Utilizing the syntactic sugar also means that flexi-bench is aware that you are indeed running a command. This sounds obvious, but opens up some neat possibilities since we are running the command from within flexi-bench. For example, we can add variations based on tailoring CLI options which would not be possible if you ran your command directly using `child_process` methods on your own.

```javascript
const { Benchmark } = require('flexi-bench');

const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: 'echo',
})
  .withVariation('with argument', (v) => v.withArgument('Hello, Earth!'))
  .withVariation('with argument', (v) => v.withArgument('Hello, Mars!'));

await benchmark.run();
```

When running commands via the syntactic sugar, the command is invoked with a function similar to below:

```typescript
const child = spawn(action, variation.cliArgs, {
  shell: true,
  windowsHide: true,
});
child.on('exit', (code) => {
  if (code === 0) {
    resolve();
  } else {
    reject(`Action failed with code ${code}`);
  }
});
```

For more information on the simple command API, see the example: ./examples/simple-command.ts

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

Suites can also be created using the runner API:

```javascript
const { suite, benchmark } = require('flexi-bench');

suite('My Suite', () => {
  benchmark('My Benchmark 1', (b) => {
    b.withIterations(10).withAction(() => {
      // some action to benchmark
    });
  });

  benchmark('My Benchmark 2', (b) => {
    b.withIterations(10).withAction(() => {
      // some action to benchmark
    });
  });
});
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

See examples folder.

- ./examples/benchmark.ts is the motivation for this project. It benchmarks the performance of Nx commands with and without a daemon.
- ./examples/performance-observer.ts is a simple example of how to use the PerformanceObserver API to measure the performance of a function.
- ./examples/simple-command.ts demonstrates how to benchmark a simple command.
