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
} from 'flexi-bench';

(async () => {
  // Example 1: Without append (default) - last benchmark overwrites the file
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
})();
