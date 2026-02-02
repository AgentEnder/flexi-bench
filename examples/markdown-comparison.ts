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
} from '../src/index';

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

  console.log('Running sorting algorithm comparison...\n');

  // Example 1: MarkdownSuiteReporter with multiple variations
  console.log('1. Suite Reporter (with comparison tables):');
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

  console.log('   ✓ Generated: ./examples/output/sorting-comparison.md');
  console.log('   (Includes comparison table showing relative performance)\n');

  // Example 2: MarkdownBenchmarkReporter with append mode
  console.log('2. Benchmark Reporter with append mode:');
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

  console.log(
    '   ✓ Generated: ./examples/output/benchmark-append-comparison.results.md',
  );
  console.log('   (Each benchmark has its own comparison table)\n');

  // Example 3: Single benchmark (no comparison)
  console.log('3. Single benchmark (no comparison table):');
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

  console.log('   ✓ Generated: ./examples/output/single-benchmark.results.md');
  console.log('   (No comparison table since only one variation)\n');

  // Results explanation
  console.log('─'.repeat(60));
  console.log('COMPARISON TABLE FEATURE:');
  console.log('─'.repeat(60));
  console.log('When a benchmark has multiple variations, the markdown');
  console.log('reporters now automatically generate a "Comparison" section');
  console.log('showing:');
  console.log('');
  console.log('  • Average time for each variation');
  console.log('  • Percentage difference vs the fastest');
  console.log('  • Multiplier (e.g., 2.5x slower)');
  console.log('  • Trophy emoji (🏆) for the winner');
  console.log('');
  console.log('This makes it easy to see which implementation is fastest');
  console.log('at a glance in your benchmark reports!');
  console.log('─'.repeat(60));
})();
