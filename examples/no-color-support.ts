// ---
// id: 'no-color-support'
// title: 'NO_COLOR Support'
// sidebar_label: 'NO_COLOR Support'
// description: 'Using the NO_COLOR environment variable and noColor option to disable colored output in console reporters.'
// ---

/**
 * Example: NO_COLOR Support
 *
 * This example demonstrates how to use the NO_COLOR environment variable
 * and the noColor option to disable colored output in console reporters.
 */

import {
  Suite,
  Benchmark,
  SuiteConsoleReporter,
  BenchmarkConsoleReporter,
  MarkdownSuiteReporter,
} from 'flexi-bench';

(async () => {
  console.log('=== Example 1: Default (colors enabled if supported) ===\n');

  await new Suite('Default Colors')
    .withReporter(new SuiteConsoleReporter())
    .addBenchmark(
      new Benchmark('Simple Math', {
        iterations: 3,
        reporter: new BenchmarkConsoleReporter(),
        action: () => {
          for (let i = 0; i < 100000; i++) {
            Math.sqrt(i);
          }
        },
      }),
    )
    .run();

  console.log('\n=== Example 2: Explicit noColor option ===\n');

  await new Suite('Explicit No Color')
    .withReporter(new SuiteConsoleReporter({ noColor: true }))
    .addBenchmark(
      new Benchmark('Simple Math', {
        iterations: 3,
        reporter: new BenchmarkConsoleReporter({ noColor: true }),
        action: () => {
          for (let i = 0; i < 100000; i++) {
            Math.sqrt(i);
          }
        },
      }),
    )
    .run();

  console.log('\n=== Example 3: NO_COLOR environment variable ===');
  console.log('Set NO_COLOR environment variable to disable colors:');
  console.log('  NO_COLOR=1 npx tsx examples/no-color-support.ts\n');

  // Check if NO_COLOR is set
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') {
    console.log(
      'NO_COLOR is currently set, so reporters will not use colors.\n',
    );
  } else {
    console.log('NO_COLOR is not set. Colors may be used if supported.\n');
  }

  console.log('Key points:');
  console.log('- Set NO_COLOR environment variable to disable colors globally');
  console.log('- Or pass { noColor: true } to individual reporters');
  console.log('- Useful for CI/CD environments where ANSI colors can be noisy');
})();
