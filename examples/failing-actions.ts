// ---
// id: failing-actions
// title: Failing Actions
// description: |
//   This example showcases how flexi-bench handles an action which fails, and can help debug the issue.
// expect_failure: true
// ---
import {
  AggregateBenchmarkError,
  benchmark,
  ErrorStrategy,
  NoopReporter,
  suite,
} from 'flexi-bench';

const reporter = new NoopReporter();

// This block demonstrates ErrorStrategy.Continue, the default.
// With ErrorStrategy.Continue, the benchmark will continue running even if an error occurs.
// The errors will be collected and presented as part of the results.
suite('Failing Actions (ErrorStrategy.Continue)', (s) => {
  benchmark('Failing Action', (b) => {
    b.withIterations(100)
      .withAction(() => {
        if (Math.random() > 0.5) {
          throw new Error('This action failed');
        }
      })
      .withReporter(reporter);
  });
});

// This block demonstrates ErrorStrategy.Abort
// With ErrorStrategy.Abort, the error will be thrown immediately rather than aggregated or collected.
// This is useful when you want to stop the benchmark run immediately when an error occurs.
async function errorStrategyAbort() {
  let completedIterations = 0;
  try {
    await benchmark('Failing Action (abort)', (b) => {
      b.withAction(() => {
        completedIterations++;
        if (Math.random() > 0.5) throw new Error('This action failed');
      })
        .withIterations(10)
        .withErrorStrategy(ErrorStrategy.Abort)
        .withReporter(reporter);
    });
  } catch {
    console.log(
      'Completed iterations (ErrorStrategy.Abort):',
      completedIterations,
    );
  }
}

// This block demonstrates ErrorStrategy.DelayedThrow
// With ErrorStrategy.DelayedThrow, the error will be thrown at the end of the benchmark run.
// This is useful when you want the benchmark to continue running and collect results, but still exit with an error if any of the benchmarks fail.
async function errorStrategyDelayedThrow() {
  try {
    const results = await benchmark('Failing Action (delayed-throw)', (b) => {
      b.withAction(() => {
        if (Math.random() > 0.5) throw new Error('This action failed');
      })
        .withIterations(10)
        .withErrorStrategy(ErrorStrategy.DelayedThrow)
        .withReporter(reporter);
    });
    console.log(results);
  } catch (e) {
    if (e instanceof AggregateBenchmarkError) {
      console.log(
        'Failure rate (ErrorStrategy.DelayedThrow):',
        e.results[0].failureRate,
      );
    }
  }
}

(async () => {
  await errorStrategyAbort();
  await errorStrategyDelayedThrow();
})();
