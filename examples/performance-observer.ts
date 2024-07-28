// ---
// id: performance-observer
// title: Performance Observer
// sidebar_label: Performance Observer
// description: |
//   FlexiBench provides a `.withPerformanceObserver()` method to easily capture performance of segments of the callback function.
//   This example demonstrates how to use the Performance Observer to capture performance of the \`createProjectGraphAsync\` function.
//   Because `nx` uses `performance.mark` and `performance.measure` within its codebase, we can easily debug which portion has slowed down.
//
//   Note: A performance observer can not capture performance of code running via child processes, so it only works for callback functions.
// ---
import { createProjectGraphAsync } from '@nx/devkit';
import { daemonClient } from 'nx/src/daemon/client/client';

import {
  Benchmark,
  BenchmarkConsoleReporter,
  MarkdownBenchmarkReporter,
} from 'flexi-bench';
import { join } from 'path';

const defaultReporter = new BenchmarkConsoleReporter();
const markdownReporter = new MarkdownBenchmarkReporter({
  outputFile: join(__dirname, 'performance-observer.results.md'),
  fields: ['average', 'p95'],
});

(async () => {
  await new Benchmark('Performance Observer Demo', {
    iterations: 5,
    action: async () => {
      // The createProjectGraphAsync isn't tolerable to how we reset
      // the daemon client, so without this delay, the graph construction
      // will fail.
      await new Promise((r) => setImmediate(r));
      await createProjectGraphAsync();
    },
    reporter: {
      progress: defaultReporter.progress.bind(defaultReporter),
      report: markdownReporter.report.bind(markdownReporter),
    },
  })
    .withPerformanceObserver({
      label: (name) => name.replace(/.*\/node_modules\/nx\/src\/plugins/, 'nx'),
    })
    .withVariation('With Daemon', (v) =>
      v
        // Nx read's the NX_DAEMON environment variable to determine
        // whether or not to use the daemon when the daemon client is
        // initialized. This is a way to reset the daemon client to
        // force Nx to reread the environment variable.
        .withSetup(() => daemonClient.reset())
        .withEnvironmentVariable('NX_DAEMON', 'true'),
    )
    .withVariation('Without Daemon', (v) =>
      v
        .withSetup(() => daemonClient.reset())
        .withEnvironmentVariable('NX_DAEMON', 'false'),
    )
    .run();
  process.exit(0);
})();
