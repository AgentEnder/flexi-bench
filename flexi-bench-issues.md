# flexi-bench DX Issues

Issues and improvement suggestions discovered while building the `isolated-workers` benchmark suite.

## Type Exports

### `Result` type not exported

The `Result` type is defined in `src/results.ts` but not re-exported from the main `index.ts`. This forces consumers to define their own interface when building custom reporters:

```typescript
// Have to define this locally because it's not exported
interface Result {
  label: string;
  min: number;
  max: number;
  average: number;
  p95: number;
  raw: (number | Error)[];
  failed?: boolean;
  failureRate?: number;
}
```

**Fix:** Add `export * from './results';` to `index.ts`

### Missing metadata on `Result` type

The `Result` type doesn't include useful metadata that would help with reporting:

- **`iterations`** - How many iterations were run (useful for reports)
- **`benchmarkName`** - The name of the benchmark (currently only passed to BenchmarkReporter separately)
- **`variationName`** - Which variation produced this result (currently in `label` but not typed)
- **`duration`** - Total wall-clock time for all iterations

**Suggestion:** Extend the Result type:

```typescript
type Result = {
  label: string;
  // ... existing fields ...

  // New metadata fields
  iterations: number;
  totalDuration: number;
  benchmarkName?: string;
  variationName?: string;
}
```

## Reporters

### `MarkdownBenchmarkReporter` overwrites file per benchmark

When using `withBenchmarkReporter(new MarkdownBenchmarkReporter({ outputFile }))` on a Suite, the reporter is called for each benchmark and overwrites the file each time. Only the last benchmark's results are preserved.

**Expected behavior:** Append to file or accumulate results

**Workaround:** Use `withReporter()` with a custom `SuiteReporter` that receives all results at once

### No built-in `MarkdownSuiteReporter`

There's `MarkdownBenchmarkReporter` but no equivalent suite-level reporter. For aggregated reports, consumers must build their own.

**Suggestion:** Add `MarkdownSuiteReporter` that generates a single file with all benchmarks:

```typescript
new MarkdownSuiteReporter({
  outputFile: 'results.md',
  title: 'Benchmark Results',
  fields: ['min', 'max', 'average', 'p95'],
})
```

### `SuiteReporter` interface is minimal

The `SuiteReporter` interface only has:

```typescript
interface SuiteReporter {
  report: (results: Record<string, Result[]>) => void;
}
```

Missing hooks that would be useful:
- `onSuiteStart(suiteName: string)` - Before any benchmarks run
- `onBenchmarkStart(benchmarkName: string)` - Before each benchmark
- `onBenchmarkEnd(benchmarkName: string, results: Result[])` - After each benchmark
- `onSuiteEnd(results: Record<string, Result[]>)` - Rename current `report` for clarity

### Reporter receives no suite metadata

The `SuiteReporter.report()` method receives results but no context about:
- Suite name
- Suite configuration (variations, error strategy)
- Total runtime
- Which benchmarks were skipped (if any)

### No composite/aggregate reporter

There's no built-in way to combine multiple reporters. Common patterns that require this:

```typescript
// Want to do both console output AND file output
suite.withReporter(new CompositeReporter([
  new SuiteConsoleReporter(),
  new MarkdownSuiteReporter({ outputFile: 'results.md' }),
  new JsonSuiteReporter({ outputFile: 'results.json' }),
]))
```

**Suggestion:** Add `CompositeReporter` or `ChainedReporter`:

```typescript
export class CompositeReporter implements SuiteReporter {
  constructor(private reporters: SuiteReporter[]) {}

  report(results: Record<string, Result[]>): void {
    for (const reporter of this.reporters) {
      reporter.report(results);
    }
  }
}
```

### No historical tracking reporter

For performance regression detection, it would be valuable to have reporters that:

1. **Store results in JSON** for machine-readable historical data
2. **Generate markdown** with trends, comparisons to previous runs
3. **Detect regressions** by comparing against baseline or recent history

**Suggested architecture - separate concerns:**

```typescript
// JsonHistoryReporter: append-only, writes current run to history file
new JsonHistoryReporter({
  outputFile: 'benchmarks/history.json',
  maxHistory: 50,
  includeCommitInfo: true,
  includePlatform: true,
})

// HistoricalMarkdownReporter: reads from data source, generates markdown view
new HistoricalMarkdownReporter({
  dataSource: 'benchmarks/history.json', // or a custom DataSource
  outputFile: 'benchmarks/BENCHMARKS.md',
  regressionThreshold: 0.1, // 10% slower = regression
})
```

**Composed together:**

```typescript
suite.withReporter(new CompositeReporter([
  // First: append current results to JSON history
  new JsonHistoryReporter({
    outputFile: 'benchmarks/history.json',
    maxHistory: 50,
  }),

  // Second: read full history and regenerate markdown
  new HistoricalMarkdownReporter({
    dataSource: 'benchmarks/history.json',
    outputFile: 'benchmarks/BENCHMARKS.md',
  }),

  // Also output to console
  new SuiteConsoleReporter(),
]))
```

**Custom data sources:**

The `dataSource` parameter could accept a file path (JSON) or a `DataSource` interface for custom storage:

```typescript
interface HistoricalDataSource {
  read(): Promise<HistoricalRun[]>;
}

// Built-in: JsonFileDataSource (reads from JSON file)
// Custom: DatabaseDataSource, S3DataSource, etc.

new HistoricalMarkdownReporter({
  dataSource: new PostgresDataSource({ connectionString: '...' }),
  outputFile: 'benchmarks/BENCHMARKS.md',
})
```

**JSON structure:**

```json
{
  "runs": [
    {
      "timestamp": "2026-02-02T15:00:00Z",
      "commit": "abc123",
      "platform": "darwin",
      "results": {
        "Startup: spawn and connect": [
          { "label": "child_process", "average": 200.5, "p95": 350.2, ... },
          { "label": "worker_threads", "average": 18.3, "p95": 22.1, ... }
        ]
      }
    }
  ]
}
```

**Generated markdown:**

````markdown
# Benchmark History

## Latest Results (2026-02-02)

| Benchmark | Variation | Average | vs Previous | vs Baseline |
|-----------|-----------|---------|-------------|-------------|
| Startup   | child_process | 200ms | +5% ⚠️ | +2% |
| Startup   | worker_threads | 18ms | -3% ✅ | -10% ✅ |

## Trends (last 10 runs)

### Startup: spawn and connect

```
    child_process (ms)                 worker_threads (ms)
    250.00 ┤      ╭─╮                  25.00 ┤
    225.00 ┤    ╭─╯ │                  22.50 ┤  ╭╮
    200.00 ┼──╮╭╯   ╰─╮                20.00 ┼──╯╰╮    ╭╮
    175.00 ┤  ╰╯      ╰──              17.50 ┤    ╰────╯╰──
    150.00 ┤                           15.00 ┤
```

Uses [asciichart](https://github.com/kroitor/asciichart) for portable, git-friendly visualizations.

## Regressions Detected

- ⚠️ `Startup: spawn and connect` (child_process) regressed 5% from previous run
````

This pattern of JSON-as-source-of-truth with markdown-as-view is powerful for:
- CI/CD integration (read JSON programmatically)
- Human review (read markdown in GitHub)
- Historical analysis (query JSON for trends)
- Git-friendly (markdown diffs are readable)

## API Consistency

### Runner API vs Builder API naming

The runner API uses `beforeAll`/`afterAll`:
```typescript
benchmark('test', (b) => {
  beforeAll(async () => { /* setup */ });
  afterAll(async () => { /* teardown */ });
  b.withAction(...);
});
```

The builder API uses `withSetup`/`withTeardown`:
```typescript
new Benchmark('test')
  .withSetup(async () => { /* setup */ })
  .withTeardown(async () => { /* teardown */ })
  .withAction(...);
```

**Suggestion:** Align naming. Either:
- Add `withBeforeAll`/`withAfterAll` aliases to Benchmark class
- Or document the naming difference prominently

### Variations require environment variable dance

When using variations to swap implementations (like drivers), the benchmark action has no direct access to which variation is running:

```typescript
// Current approach - use env vars
const driverVariations = [
  new Variation('child_process').withEnvironmentVariable('BENCH_DRIVER', 'child_process'),
  new Variation('worker_threads').withEnvironmentVariable('BENCH_DRIVER', 'worker_threads'),
];

function getDriver() {
  return process.env.BENCH_DRIVER === 'worker_threads' ? WorkerThreadsDriver : undefined;
}
```

**Suggestion:** Pass variation context to action:

```typescript
b.withAction(async (variation) => {
  const driver = variation.get('driver'); // or variation.name
});
```

The `ActionMethod` type already receives `Variation` but it's not well documented and the Variation doesn't expose custom data easily.

## Documentation

### Variation.withEnvironmentVariable not documented in examples

The full example shows `Variation.FromEnvironmentVariables()` but not the instance method `.withEnvironmentVariable()` which is cleaner for simple cases.

### Missing recipe for "same benchmark, different implementations"

A common use case is benchmarking multiple implementations of the same interface. This requires:
1. Defining variations with identifiers
2. Reading the identifier in setup/action
3. Selecting the right implementation

A cookbook example would help.

## Minor Issues

### Console reporter colors in CI

The `BenchmarkConsoleReporter` and `SuiteConsoleReporter` output ANSI colors which can be noisy in CI logs. Consider:
- `NO_COLOR` environment variable support
- Constructor option to disable colors

### No JSON reporter

For CI/CD integration and historical tracking, a JSON reporter would be useful:

```typescript
new JsonBenchmarkReporter({
  outputFile: 'results.json',
  pretty: true,
})
```

### `fields` option type allows 'raw' but probably shouldn't display it

The `MarkdownBenchmarkReporter` accepts `fields: ['raw', ...]` but raw data (array of numbers/errors) doesn't make sense in a markdown table.

---

## Summary

**Priority fixes:**
1. Export `Result` type
2. Add iteration count to `Result`
3. Add `MarkdownSuiteReporter`
4. Pass suite metadata to reporters

**Reporter improvements:**
- `CompositeReporter` for chaining multiple reporters
- `JsonHistoryReporter` for append-only historical data persistence
- `HistoricalMarkdownReporter` with pluggable data source + regression detection
- `DataSource` interface for custom storage backends (file, database, S3, etc.)

**Nice to have:**
- Variation context in actions
- Lifecycle hooks on SuiteReporter
- `NO_COLOR` support in console reporters
