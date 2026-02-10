// ---
// id: 'multiple-reporters'
// title: 'Multiple Reporters'
// sidebar_label: 'Multiple Reporters'
// description: 'Using CompositeReporter to output results to multiple destinations simultaneously - console, markdown file, and JSON file.'
// ---

/**
 * Example: Multiple Reporters with CompositeReporter
 *
 * This example shows how to use CompositeReporter to output results to
 * multiple destinations simultaneously - console, markdown file, and JSON file.
 */

import {
  Benchmark,
  CompositeReporter,
  JsonSuiteReporter,
  MarkdownSuiteReporter,
  Suite,
  SuiteConsoleReporter,
  Variation,
} from 'flexi-bench';

(async () => {
  const results = await new Suite('Multiple Reporters Example')
    .withReporter(
      new CompositeReporter([
        // Output to console
        new SuiteConsoleReporter(),
        // Output to markdown file
        new MarkdownSuiteReporter({
          outputFile: './examples/output/multiple-reporters.results.md',
          title: 'Benchmark Results',
          fields: ['min', 'average', 'p95', 'max', 'iterations'],
        }),
        // Output to JSON file for CI/CD integration
        new JsonSuiteReporter({
          outputFile: './examples/output/multiple-reporters.results.json',
          pretty: true,
          includeMetadata: true,
        }),
      ]),
    )
    .addBenchmark(
      new Benchmark('Math Operation', {
        iterations: 5,
        action: () => {
          // Simulate some work
          let sum = 0;
          for (let i = 0; i < 1000000; i++) {
            sum += i;
          }
        },
      }).withVariations([
        new Variation('Fast'),
        new Variation('Slow').withAction(() => {
          let sum = 0;
          for (let i = 0; i < 10000000; i++) {
            sum += i;
          }
        }),
      ]),
    )
    .addBenchmark(
      new Benchmark('String Manipulation', {
        iterations: 5,
        action: () => {
          let str = '';
          for (let i = 0; i < 10000; i++) {
            str += 'a';
          }
        },
      }),
    )
    .run();

  console.log('\nResults saved to:');
  console.log('  - ./examples/output/multiple-reporters.results.md');
  console.log('  - ./examples/output/multiple-reporters.results.json');
})();
