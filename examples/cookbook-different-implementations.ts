// ---
// id: 'different-implementations'
// title: 'Different Implementations'
// sidebar_label: 'Different Implementations'
// description: 'Benchmarking multiple implementations of the same interface using variations and the context API.'
// ---

/**
 * Cookbook: Same Benchmark, Different Implementations
 *
 * This example demonstrates how to benchmark multiple implementations
 * of the same interface using variations to swap between them.
 *
 * This uses the new context API (withContext/get) to pass implementation
 * references directly, avoiding the environment variable "dance".
 */

import {
  Benchmark,
  MarkdownSuiteReporter,
  Suite,
  Variation,
} from 'flexi-bench';

// Define a common interface
interface DataProcessor {
  process(data: number[]): number;
}

// Implementation 1: Simple loop
class LoopProcessor implements DataProcessor {
  process(data: number[]): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum;
  }
}

// Implementation 2: Using reduce
class ReduceProcessor implements DataProcessor {
  process(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0);
  }
}

// Implementation 3: Using for...of
class ForOfProcessor implements DataProcessor {
  process(data: number[]): number {
    let sum = 0;
    for (const val of data) {
      sum += val;
    }
    return sum;
  }
}

// Create processor instances
const loopProcessor = new LoopProcessor();
const reduceProcessor = new ReduceProcessor();
const forOfProcessor = new ForOfProcessor();

(async () => {
  // Generate test data
  const testData = Array.from({ length: 100000 }, (_, i) => i);

  const results = await new Suite('Data Processing Implementations')
    .withReporter(
      new MarkdownSuiteReporter({
        outputFile: './examples/output/implementation-comparison.results.md',
        title: 'Implementation Comparison Results',
        fields: ['min', 'average', 'p95', 'max', 'iterations'],
      }),
    )
    .addBenchmark(
      new Benchmark('Sum Large Array')
        .withIterations(10)
        // Use FromContext factory for clean, concise variation creation
        // No more environment variable dance!
        .withVariations(
          Variation.FromContexts<DataProcessor>('processor', [
            ['loop', loopProcessor],
            ['reduce', reduceProcessor],
            ['forof', forOfProcessor],
          ]),
        )
        .withAction((variation) => {
          // Access the implementation directly via get()
          const processor = variation.get<DataProcessor>('processor');
          if (!processor) {
            throw new Error('Processor not found in variation context');
          }

          // Run the benchmark
          processor.process(testData);
        }),
    )
    .run();

  // Results will be saved to: ./examples/output/implementation-comparison.results.md
  //
  // Key takeaways:
  // - Use Variation.FromContexts() for clean, declarative variation setup
  // - Pass objects directly - no environment variables needed!
  // - Use get<T>() to retrieve context data in actions
  // - Type-safe and concise API
})();
