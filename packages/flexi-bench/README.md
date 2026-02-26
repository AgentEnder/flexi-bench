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
- [Warmup Iterations](#warmup-iterations): Run unmeasured warmups before timed iterations.
- [Commands](#commands): Run simple commands as benchmarks.
- [Blackhole Result Sink](#blackhole-result-sink): Prevent dead-code elimination for callback benchmarks.

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

#### Warmup Iterations

Warmups are iterations that run before measured iterations. They are useful for:

- Warming JIT-compiled code paths
- Warming caches and one-time initialization
- Reducing "first iteration" distortion in reported numbers

Use `.withWarmupIterations(count)` on a benchmark:

```javascript
benchmark('My Benchmark', (b) => {
  b.withWarmupIterations(5).withIterations(20).withAction(() => {
    doWork();
  });
});
```

You can also override warmups per variation:

```javascript
benchmark('My Benchmark', (b) => {
  b.withWarmupIterations(5).withIterations(10).withAction((variation) => {
    runImplementation(variation.name);
  });

  variation('hot-path', (v) => v.withWarmupIterations(10));
  variation('cold-path', (v) => v.withWarmupIterations(2));
});
```

Warmup iterations are not included in result stats (`min`, `max`, `average`, `p95`, `raw`, and `iterations`).

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

#### Blackhole Result Sink

Callback actions may compute values that are otherwise unused. In some cases, engines can optimize those computations aggressively. FlexiBench automatically consumes callback return values through an internal blackhole sink on every iteration.

```javascript
benchmark('sum array', (b) => {
  b.withIterations(100).withAction(() => {
    return numbers.reduce((acc, n) => acc + n, 0);
  });
});
```

For custom scenarios, you can also use the exported `blackhole` helper directly:

```javascript
const { blackhole } = require('flexi-bench');

benchmark('manual sink', (b) => {
  b.withAction(() => {
    const value = compute();
    blackhole(value);
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

#### Variation Context

For more complex scenarios where you need to pass objects or data directly to the benchmark action, use the context API instead of environment variables:

```javascript
const { Benchmark, Variation } = require('flexi-bench');

// Define different implementations
const loopProcessor = {
  process: (data) => {
    /* loop */
  },
};
const reduceProcessor = {
  process: (data) => {
    /* reduce */
  },
};

// Use FromContexts for clean, declarative variation setup
const benchmark = new Benchmark('Process Data')
  .withIterations(100)
  .withVariations(
    Variation.FromContexts('processor', [
      ['loop', loopProcessor],
      ['reduce', reduceProcessor],
    ]),
  )
  .withAction((variation) => {
    // Use get() to retrieve context data
    const processor = variation.get('processor');
    processor.process(data);
  });
```

The context API provides:

- `Variation.FromContexts(key, [[name, value], ...])` - Create variations with context (cleanest API)
- `withContext(key, value)` - Attach custom data to a single variation
- `get(key)` - Retrieve context data (returns `T | undefined`)
- `getOrDefault(key, defaultValue)` - Retrieve with fallback value

Use `FromContexts` when creating multiple variations with the same context key - it's cleaner and more concise than individual `withVariation` calls with `withContext`.

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

## Reporters

Reporters control how benchmark results are output. FlexiBench provides several built-in reporters:

### Console Reporters

```javascript
const {
  Benchmark,
  BenchmarkConsoleReporter,
  SuiteConsoleReporter,
} = require('flexi-bench');

// For single benchmarks
const benchmark = new Benchmark('My Benchmark', {
  iterations: 10,
  action: () => {
    /* ... */
  },
  reporter: new BenchmarkConsoleReporter(),
});

// For suites
const suite = new Suite('My Suite')
  .withReporter(new SuiteConsoleReporter())
  .addBenchmark(benchmark);
```

Both console reporters support the `NO_COLOR` environment variable for disabling colors:

```bash
NO_COLOR=1 node my-benchmark.js
```

Or explicitly via options:

```javascript
new SuiteConsoleReporter({ noColor: true });
new BenchmarkConsoleReporter({ noColor: true });
```

### Markdown Reporters

```javascript
const {
  MarkdownBenchmarkReporter,
  MarkdownSuiteReporter,
} = require('flexi-bench');

// For single benchmark output
const benchmarkReporter = new MarkdownBenchmarkReporter({
  outputFile: 'results.md',
  fields: ['min', 'average', 'p95', 'max'],
  append: true, // Set to true to avoid overwriting when running multiple benchmarks
});

// For suite-level output (recommended)
const suiteReporter = new MarkdownSuiteReporter({
  outputFile: 'results.md',
  title: 'Benchmark Results',
  fields: ['min', 'average', 'p95', 'max', 'iterations'],
});
```

#### Automatic Comparison Tables

When a benchmark has multiple variations, both `MarkdownBenchmarkReporter` and `MarkdownSuiteReporter` automatically generate a comparison table showing:

- Average time for each variation
- Percentage difference vs the fastest variation
- Multiplier (e.g., "2.5x" slower)
- Trophy emoji (🏆) marking the fastest variation

This makes it easy to see which implementation performs best at a glance.

### JSON Reporter

For CI/CD integration:

```javascript
const { JsonSuiteReporter } = require('flexi-bench');

const reporter = new JsonSuiteReporter({
  outputFile: 'results.json',
  pretty: true,
  includeMetadata: true, // Includes timestamp, platform, node version
});
```

### Composite Reporter

Use multiple reporters simultaneously:

```javascript
const {
  CompositeReporter,
  SuiteConsoleReporter,
  MarkdownSuiteReporter,
  JsonSuiteReporter,
} = require('flexi-bench');

const suite = new Suite('My Suite').withReporter(
  new CompositeReporter([
    new SuiteConsoleReporter(),
    new MarkdownSuiteReporter({ outputFile: 'results.md' }),
    new JsonSuiteReporter({ outputFile: 'results.json' }),
  ]),
);
```

### Custom Reporters

Create custom reporters by implementing the `SuiteReporter` interface:

```typescript
import { SuiteReporter, Result } from 'flexi-bench';

class MyCustomReporter implements SuiteReporter {
  // Optional lifecycle hooks
  onSuiteStart?(suiteName: string): void {
    console.log(`Starting suite: ${suiteName}`);
  }

  onBenchmarkStart?(benchmarkName: string): void {
    console.log(`Running: ${benchmarkName}`);
  }

  onBenchmarkEnd?(benchmarkName: string, results: Result[]): void {
    console.log(`Completed: ${benchmarkName}`);
  }

  // Required: called after all benchmarks complete
  report(results: Record<string, Result[]>): void {
    // Process results here
    for (const [name, result] of Object.entries(results)) {
      console.log(`${name}: ${result[0].average}ms average`);
    }
  }
}
```

## Result Type

The `Result` type contains comprehensive information about benchmark runs:

```typescript
interface Result {
  // Basic metrics
  label: string; // Name of benchmark or variation
  min: number; // Minimum duration (ms)
  max: number; // Maximum duration (ms)
  average: number; // Average duration (ms)
  p95: number; // 95th percentile duration (ms)
  raw: (number | Error)[]; // Raw durations/errors

  // Failure information
  failed?: boolean; // Whether any iteration failed
  failureRate?: number; // Rate of failures (0-1)

  // Metadata (useful for custom reporters)
  iterations?: number; // Number of iterations run
  totalDuration?: number; // Total wall-clock time (ms)
  benchmarkName?: string; // Name of parent benchmark
  variationName?: string; // Name of variation

  // Subresults from performance observer
  subresults?: Result[];
}
```

The Result type is exported from the main package:

```typescript
import { Result } from 'flexi-bench';
```

## Cookbook

### Benchmarking Multiple Implementations

Compare different implementations of the same interface:

```javascript
const {
  Suite,
  Benchmark,
  Variation,
  MarkdownSuiteReporter,
} = require('flexi-bench');

// Define your implementations
const implementations = {
  loop: (data) => {
    /* loop implementation */
  },
  reduce: (data) => {
    /* reduce implementation */
  },
};

const suite = new Suite('Implementation Comparison')
  .withReporter(new MarkdownSuiteReporter({ outputFile: 'results.md' }))
  .addBenchmark(
    new Benchmark('Process Data')
      .withIterations(100)
      // Create variations with context - no environment variables needed!
      .withVariations(
        Variation.FromContexts('impl', [
          ['loop', implementations.loop],
          ['reduce', implementations.reduce],
        ]),
      )
      .withAction((variation) => {
        // Retrieve the implementation directly from context
        const impl = variation.get('impl');
        const data = [
          /* test data */
        ];
        impl(data);
      }),
  );
```

## Examples

See examples folder.

- `./examples/benchmark.ts` - Full benchmark suite with environment variable variations
- `./examples/performance-observer.ts` - Using PerformanceObserver API
- `./examples/simple-command.ts` - Benchmarking CLI commands
- `./examples/multiple-reporters.ts` - Using CompositeReporter for multiple outputs
- `./examples/custom-reporter.ts` - Creating custom reporters with Result type
- `./examples/cookbook-different-implementations.ts` - Comparing implementations
- `./examples/no-color-support.ts` - Disabling colors in CI environments
- `./examples/markdown-reporter-append.ts` - Using append mode for MarkdownReporter
- `./examples/markdown-comparison.ts` - Demonstrates automatic comparison tables with variations
