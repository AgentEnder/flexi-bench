// ---
// id: 'custom-reporter'
// title: 'Custom Reporter'
// sidebar_label: 'Custom Reporter'
// description: 'Creating custom reporters using the Result type with metadata fields like iterations, totalDuration, benchmarkName, and variationName.'
// ---

/**
 * Example: Custom Reporter with Result Type
 *
 * This example shows how to create a custom reporter that uses the Result type,
 * including the new metadata fields (iterations, totalDuration, benchmarkName, variationName).
 */

import {
  Suite,
  Benchmark,
  Variation,
  SuiteReporter,
  Result,
  MarkdownSuiteReporter,
} from 'flexi-bench';

/**
 * A custom reporter that outputs a summary with statistics
 * and demonstrates accessing Result metadata
 */
class SummaryReporter implements SuiteReporter {
  report(results: Record<string, Result[]>): void {
    console.log('\n========== BENCHMARK SUMMARY ==========\n');

    let totalBenchmarks = 0;
    let totalVariations = 0;
    let totalIterations = 0;

    for (const [benchmarkName, benchmarkResults] of Object.entries(results)) {
      totalBenchmarks++;
      console.log(`📊 ${benchmarkName}`);

      for (const result of benchmarkResults) {
        totalVariations++;

        // Access Result metadata fields
        const iterations = result.iterations ?? 'N/A';
        const totalDuration = result.totalDuration
          ? `${result.totalDuration.toFixed(2)}ms`
          : 'N/A';
        const benchmarkLabel = result.benchmarkName ?? benchmarkName;
        const variationLabel = result.variationName ?? result.label;

        if (typeof iterations === 'number') {
          totalIterations += iterations;
        }

        console.log(`  └─ ${variationLabel}`);
        console.log(`     ├─ Average: ${result.average.toFixed(2)}ms`);
        console.log(`     ├─ P95: ${result.p95.toFixed(2)}ms`);
        console.log(`     ├─ Iterations: ${iterations}`);
        console.log(`     └─ Total Duration: ${totalDuration}`);

        // Check for failures
        if (result.failed) {
          console.log(
            `     ⚠️  FAILED (${((result.failureRate ?? 0) * 100).toFixed(1)}% failure rate)`,
          );
        }
      }
      console.log('');
    }

    console.log('========== STATISTICS ==========');
    console.log(`Total Benchmarks: ${totalBenchmarks}`);
    console.log(`Total Variations: ${totalVariations}`);
    console.log(`Total Iterations: ${totalIterations}`);
    console.log('================================\n');
  }
}

/**
 * A custom reporter with lifecycle hooks
 */
class LifecycleReporter implements SuiteReporter {
  onSuiteStart(suiteName: string): void {
    console.log(`\n🚀 Starting suite: ${suiteName}`);
  }

  onBenchmarkStart(benchmarkName: string): void {
    console.log(`  🏃 Starting benchmark: ${benchmarkName}`);
  }

  onBenchmarkEnd(benchmarkName: string, results: Result[]): void {
    const avgTime =
      results.reduce((sum, r) => sum + r.average, 0) / results.length;
    console.log(
      `  ✅ Completed benchmark: ${benchmarkName} (avg: ${avgTime.toFixed(2)}ms)`,
    );
  }

  report(results: Record<string, Result[]>): void {
    console.log('\n📋 Final Report:');
    console.log(`  ${Object.keys(results).length} benchmarks completed`);
  }
}

(async () => {
  const results = await new Suite('Custom Reporter Demo')
    .withReporter(
      // Use CompositeReporter to run multiple reporters
      {
        report: (results: Record<string, Result[]>) => {
          // Run both custom reporters
          new SummaryReporter().report(results);
          new LifecycleReporter().report(results);
        },
        onSuiteStart: (suiteName: string) => {
          new LifecycleReporter().onSuiteStart?.(suiteName);
        },
        onBenchmarkStart: (benchmarkName: string) => {
          new LifecycleReporter().onBenchmarkStart?.(benchmarkName);
        },
        onBenchmarkEnd: (benchmarkName: string, results: Result[]) => {
          new LifecycleReporter().onBenchmarkEnd?.(benchmarkName, results);
        },
      },
    )
    .addBenchmark(
      new Benchmark('Fast Operation').withIterations(5).withAction(() => {
        // Quick operation
        Math.sqrt(12345);
      }),
    )
    .addBenchmark(
      new Benchmark('Slow Operation')
        .withIterations(5)
        .withAction(() => {
          // Slower operation
          for (let i = 0; i < 1000000; i++) {
            Math.sqrt(i);
          }
        })
        .withVariations([
          new Variation('Variation A'),
          new Variation('Variation B'),
        ]),
    )
    .run();

  console.log('\nKey points demonstrated:');
  console.log('- Result type is now exported and includes metadata');
  console.log(
    '- Custom reporters can access iterations, totalDuration, benchmarkName, variationName',
  );
  console.log(
    '- SuiteReporter has optional lifecycle hooks: onSuiteStart, onBenchmarkStart, onBenchmarkEnd',
  );
})();
