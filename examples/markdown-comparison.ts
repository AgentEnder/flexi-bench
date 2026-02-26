// ---
// id: 'markdown-comparison'
// title: 'Markdown Comparison Tables'
// sidebar_label: 'Markdown Comparison Tables'
// description: 'How MarkdownSuiteReporter automatically generates comparison tables showing relative performance when benchmarks have multiple variations.'
// ---

/**
 * Example: Markdown Reporter with Variation Comparisons
 *
 * This example demonstrates how MarkdownSuiteReporter automatically
 * generates comparison tables when benchmarks contain multiple variations.
 */

import {
  Benchmark,
  MarkdownBenchmarkReporter,
  MarkdownSuiteReporter,
  Suite,
  Variation,
} from 'flexi-bench';

// Simple sorting implementations to compare
const bubbleSort = (arr: number[]) => {
  const result = [...arr];
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length - i - 1; j++) {
      if (result[j] > result[j + 1]) {
        [result[j], result[j + 1]] = [result[j + 1], result[j]];
      }
    }
  }
  return result;
};

const quickSort = (arr: number[]): number[] => {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter((x) => x < pivot);
  const middle = arr.filter((x) => x === pivot);
  const right = arr.filter((x) => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
};

const nativeSort = (arr: number[]) => [...arr].sort((a, b) => a - b);

(async () => {
  // Generate test data
  const testData = Array.from({ length: 1000 }, () =>
    Math.floor(Math.random() * 1000),
  );

  // Example 1: MarkdownSuiteReporter with multiple variations
  await new Suite('Sorting Algorithms Comparison')
    .withReporter(
      new MarkdownSuiteReporter({
        outputFile: './examples/output/sorting-comparison.results.md',
        title: 'Sorting Algorithm Performance',
        fields: ['min', 'average', 'p95', 'max'],
      }),
    )
    .addBenchmark(
      new Benchmark('Sort 1000 Items')
        .withIterations(5)
        .withVariations(
          Variation.FromContexts<(arr: number[]) => number[]>('sortFn', [
            ['bubble', bubbleSort],
            ['quick', quickSort],
            ['native', nativeSort],
          ]),
        )
        .withAction((variation) => {
          const sortFn = variation.get<(arr: number[]) => number[]>('sortFn')!;
          sortFn(testData);
        }),
    )
    .run();

  // Example 2: MarkdownBenchmarkReporter with append mode
  const reporter = new MarkdownBenchmarkReporter({
    outputFile: './examples/output/benchmark-append-comparison.results.md',
    fields: ['min', 'average', 'p95', 'max'],
    append: true,
  });

  reporter.clear();

  await new Suite('Multiple Benchmarks')
    .withBenchmarkReporter(reporter)
    .addBenchmark(
      new Benchmark('String Concatenation')
        .withIterations(5)
        .withVariations(
          Variation.FromContexts<string>('method', [
            ['plus', '+'],
            ['template', 'template'],
            ['concat', 'concat'],
          ]),
        )
        .withAction((variation) => {
          const method = variation.get<string>('method');
          const str1 = 'Hello';
          const str2 = 'World';
          for (let i = 0; i < 10000; i++) {
            if (method === 'plus') {
              const _ = str1 + str2;
            } else if (method === 'template') {
              const _ = `${str1}${str2}`;
            } else {
              const _ = str1.concat(str2);
            }
          }
        }),
    )
    .addBenchmark(
      new Benchmark('Array Iteration')
        .withIterations(5)
        .withVariations(
          Variation.FromContexts<string>('method', [
            ['for', 'for'],
            ['forof', 'forof'],
            ['foreach', 'foreach'],
          ]),
        )
        .withAction((variation) => {
          const method = variation.get<string>('method');
          const arr = Array.from({ length: 10000 }, (_, i) => i);
          let sum = 0;
          if (method === 'for') {
            for (let i = 0; i < arr.length; i++) sum += arr[i];
          } else if (method === 'forof') {
            for (const x of arr) sum += x;
          } else {
            arr.forEach((x) => (sum += x));
          }
        }),
    )
    .run();

  await new Suite('Single Benchmark')
    .withReporter(
      new MarkdownSuiteReporter({
        outputFile: './examples/output/single-benchmark.results.md',
        title: 'Single Benchmark (No Comparison)',
      }),
    )
    .addBenchmark(
      new Benchmark('Simple Math').withIterations(3).withAction(() => {
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(i);
        }
      }),
    )
    .run();
})();
