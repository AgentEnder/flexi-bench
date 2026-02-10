// ---
// id: 'full-example'
// title: 'Full Example'
// sidebar_label: 'Full Example'
// description: 'This is a full example using flexi-bench to test some changes to Nx.'
// ---
import { ExecSyncOptions, execSync } from 'child_process';

import { benchmark, setup, setupEach, xsuite, Variation } from 'flexi-bench';

const ITERATIONS = 3;

const execSyncOptions: ExecSyncOptions = {
  stdio: 'ignore',
  shell: true as any,
};

xsuite('Nx Daemon + Isolation Benchmark', (s) => {
  s.withVariations(
    Variation.FromEnvironmentVariables([
      ['NX_DAEMON', ['true', 'false']],
      ['NX_ISOLATE_PLUGINS', ['true', 'false']],
    ]),
  );

  /**
   * Benchmarks when the cache has already been warmed before any iterations.
   */
  benchmark('Warm Cache Benchmark', (b) => {
    setup(() => {
      execSync(
        `npx nx reset --only-daemon --only-workspace-data`,
        execSyncOptions,
      );
      execSync(`npx nx show projects`, execSyncOptions);
    });

    b.withIterations(ITERATIONS).withAction('npx nx show projects');
  });

  /**
   * Benchmarks when the cache has not been warmed before any iterations.
   * In this case, the first iteration will do the majority of the work
   * to warm the cache.
   */
  benchmark('Cold Cache Benchmark', (b) => {
    setup(() => {
      execSync(
        `npx nx reset --only-daemon --only-workspace-data`,
        execSyncOptions,
      );
    });

    b.withIterations(ITERATIONS).withAction('npx nx show projects');
  });

  /**
   * Benchmarks with killing the cache and daemon before each iteration.
   * This represents a scenario where the cache is not used at all.
   */
  benchmark('No Cache Benchmark', (b) => {
    setupEach(() => {
      execSync(
        `npx nx reset --only-daemon --only-workspace-data`,
        execSyncOptions,
      );
    });

    b.withIterations(ITERATIONS).withAction('npx nx show projects');
  });
});
