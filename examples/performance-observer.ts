import { createProjectGraphAsync } from '@nx/devkit';
import { daemonClient } from 'nx/src/daemon/client/client';

import {
  Benchmark,
  BenchmarkConsoleReporter,
  MarkdownBenchmarkReporter,
  registerPerformanceObserver,
} from '../src';
import { join } from 'path';

registerPerformanceObserver({
  label: (name) => name.replace(/.*\/node_modules\/nx\/src\/plugins/, 'nx'),
});

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
