// ---
// id: 'markdown-reporter-append'
// title: 'Markdown Reporter Append'
// sidebar_label: 'Markdown Reporter Append'
// description: 'Using MarkdownBenchmarkReporter with append mode to preserve results across multiple benchmarks without overwriting.'
// ---

/**
 * Example: Markdown Benchmark Reporter with Append Mode
 *
 * This example shows how to use the MarkdownBenchmarkReporter with
 * the append option to avoid overwriting files when running multiple benchmarks.
 */

import {
  Benchmark,
  MarkdownBenchmarkReporter,
  MarkdownSuiteReporter,
  Suite,
} from '../src/index';

(async () => {
  // Example 1: Without append (default) - last benchmark overwrites the file
  console.log('=== Example 1: Without append mode (legacy behavior) ===');
  console.log('Only the last benchmark results will be in the file.\n');

  const reporterNoAppend = new MarkdownBenchmarkReporter({
    outputFile: './examples/output/no-append-example.results.md',
    fields: ['min', 'average', 'max'],
  });

  await new Suite('No Append Demo')
    .withBenchmarkReporter(reporterNoAppend)
    .addBenchmark(
      new Benchmark('First Benchmark').withIterations(3).withAction(() => {
        Math.sqrt(12345);
      }),
    )
    .addBenchmark(
      new Benchmark('Second Benchmark').withIterations(3).withAction(() => {
        for (let i = 0; i < 10000; i++) Math.sqrt(i);
      }),
    )
    .run();

  console.log('Check ./examples/output/no-append-example.md');
  console.log('Notice only "Second Benchmark" results are present.\n');

  // Example 2: With append - all benchmarks are preserved
  console.log('=== Example 2: With append mode ===');
  console.log('All benchmark results will be in the file.\n');

  const reporterWithAppend = new MarkdownBenchmarkReporter({
    outputFile: './examples/output/append-example.results.md',
    fields: ['min', 'average', 'max'],
    append: true,
  });

  // Clear the file first
  reporterWithAppend.clear();

  await new Suite('Append Demo')
    .withBenchmarkReporter(reporterWithAppend)
    .addBenchmark(
      new Benchmark('First Benchmark').withIterations(3).withAction(() => {
        Math.sqrt(12345);
      }),
    )
    .addBenchmark(
      new Benchmark('Second Benchmark').withIterations(3).withAction(() => {
        for (let i = 0; i < 10000; i++) Math.sqrt(i);
      }),
    )
    .run();

  console.log('Check ./examples/output/append-example.md');
  console.log(
    'Notice both "First Benchmark" and "Second Benchmark" results are present.\n',
  );

  // Example 3: Recommended approach - use MarkdownSuiteReporter instead
  console.log(
    '=== Example 3: Recommended approach (MarkdownSuiteReporter) ===',
  );
  console.log(
    'For suite-level reporting, use MarkdownSuiteReporter instead.\n',
  );

  await new Suite('Suite Reporter Demo')
    .withReporter(
      new MarkdownSuiteReporter({
        outputFile: './examples/output/suite-reporter-example.results.md',
        title: 'Complete Suite Results',
        fields: ['min', 'average', 'p95', 'max', 'iterations'],
      }),
    )
    .addBenchmark(
      new Benchmark('First Benchmark').withIterations(3).withAction(() => {
        Math.sqrt(12345);
      }),
    )
    .addBenchmark(
      new Benchmark('Second Benchmark').withIterations(3).withAction(() => {
        for (let i = 0; i < 10000; i++) Math.sqrt(i);
      }),
    )
    .run();

  console.log('Check ./examples/output/suite-reporter-example.md');
  console.log(
    'This generates a single, well-formatted document with all results.\n',
  );

  console.log('Best practices:');
  console.log('- Use MarkdownSuiteReporter for suite-level reporting');
  console.log(
    '- Use MarkdownBenchmarkReporter with append: true for incremental updates',
  );
  console.log('- Use the clear() method to reset files between runs');
})();
