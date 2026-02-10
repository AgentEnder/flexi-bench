// ---
// id: memory-measure
// title: Memory Measure
// sidebar_label: Memory Measure
// description: |
//   FlexiBench supports flexible measurement via the `.withMeasure()` method.
//   By default, benchmarks measure duration (time). Use MemoryMeasure to track
//   memory usage instead.
//
//   Available memory measures: rss, heapTotal, heapUsed, external, arrayBuffers
//
//   Tip: For reliable memory benchmarks, prefer fewer large contiguous
//   allocations (Buffers, TypedArrays) over many small heap objects. Large
//   allocations produce a clearer signal because they are less affected by
//   V8's minor GC (Scavenge), which targets small, short-lived objects.
// ---
import {
  Benchmark,
  BenchmarkConsoleReporter,
  MarkdownBenchmarkReporter,
  MemoryMeasure,
  Variation,
} from 'flexi-bench';
import { join } from 'path';

const consoleReporter = new BenchmarkConsoleReporter();
const markdownReporter = new MarkdownBenchmarkReporter({
  outputFile: join(__dirname, 'output', 'memory-measure.results.md'),
  fields: ['average', 'min', 'max'],
});

/** Total bytes each strategy allocates. */
const ALLOC_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Each allocator creates a single large contiguous block.
 * Fewer, larger allocations reduce GC noise during measurement.
 */
type Allocator = () => ArrayBufferLike;

const allocators: Record<string, Allocator> = {
  Buffer: () => Buffer.alloc(ALLOC_SIZE).buffer,
  Float64Array: () => new Float64Array(ALLOC_SIZE / 8).buffer,
  Uint8Array: () => new Uint8Array(ALLOC_SIZE).buffer,
};

(async () => {
  // Memory benchmark – measures heap usage per allocation strategy
  await new Benchmark('Memory Allocation Comparison', {
    iterations: 30,
    reporter: {
      progress: consoleReporter.progress.bind(consoleReporter),
      report: markdownReporter.report.bind(markdownReporter),
    },
  })
    .withMeasure(MemoryMeasure.heapUsed)
    .withVariations(
      Variation.FromContexts('allocator', [
        ['Buffer', allocators['Buffer']],
        ['Float64Array', allocators['Float64Array']],
        ['Uint8Array', allocators['Uint8Array']],
      ]),
    )
    .withAction((variation) => {
      const allocate = variation.get<Allocator>('allocator')!;
      // Keep reference alive through measurement
      const _buf = allocate();
      // Prevent dead-code elimination
      if (_buf.byteLength < 0) throw new Error('unreachable');
    })
    .run();

  // RSS benchmark – measures total process memory
  const rssReporter = new MarkdownBenchmarkReporter({
    outputFile: join(__dirname, 'output', 'memory-measure-rss.results.md'),
    fields: ['average', 'min', 'max'],
  });

  await new Benchmark('RSS Memory Comparison', {
    iterations: 5,
    reporter: {
      progress: consoleReporter.progress.bind(consoleReporter),
      report: rssReporter.report.bind(rssReporter),
    },
  })
    .withMeasure(MemoryMeasure.rss)
    .withVariations(
      Variation.FromContexts('allocator', [
        ['Buffer', allocators['Buffer']],
        ['Float64Array', allocators['Float64Array']],
        ['Uint8Array', allocators['Uint8Array']],
      ]),
    )
    .withAction((variation) => {
      const allocate = variation.get<Allocator>('allocator')!;
      const _buf = allocate();
      if (_buf.byteLength < 0) throw new Error('unreachable');
    })
    .run();

  process.exit(0);
})();
