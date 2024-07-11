import { ExecSyncOptions, execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Benchmark, Suite, Variation } from './src/index';

const ITERATIONS = 15;

const execSyncOptions: ExecSyncOptions = {
  stdio: 'ignore',
  shell: true as any,
};

/**
 * Benchmarks when the cache has already been warmed before any iterations.
 */
const warmCacheBenchmark = new Benchmark('Warm Cache Benchmark', {
  iterations: ITERATIONS,
})
  .withAction(() => {
    execSync(`npx nx show projects`, execSyncOptions);
  })
  .withSetup(() => {
    execSync(`npx nx reset`, execSyncOptions);
    execSync(`npx nx show projects`, execSyncOptions);
  });

/**
 * Benchmarks when the cache has not been warmed before any iterations.
 * In this case, the first iteration will do the majority of the work
 * to warm the cache.
 */
const coldCacheBenchmark = new Benchmark('Cold Cache Benchmark', {
  iterations: ITERATIONS,
})
  .withAction(() => {
    execSync(`npx nx show projects`, execSyncOptions);
  })
  .withSetup(() => {
    execSync(`npx nx reset`, execSyncOptions);
  });

/**
 * Benchmarks with killing the cache and daemon before each iteration.
 * This represents a scenario where the cache is not used at all.
 */
const noCacheBenchmark = new Benchmark('No Cache Benchmark', {
  iterations: ITERATIONS,
}).withAction(() => {
  execSync(`npx nx reset`, execSyncOptions);
  execSync(`npx nx show projects`, execSyncOptions);
});

/**
 * Benchmarks with a realistic cache scenario where the cache is used but one project
 * is changed between each iteration.
 */
const realisticCacheBenchmark = (() => {
  const updatedFilePath = join(
    __dirname,
    'projects',
    'cypress',
    'src',
    'test_file.json',
  );

  function updateProject() {
    if (!existsSync(updatedFilePath)) {
      writeFileSync(updatedFilePath, '{number: 1}');
    } else {
      const content = JSON.parse(
        readFileSync(updatedFilePath, { encoding: 'utf-8' }),
      ) as {
        number: number;
      };
      content.number++;
      writeFileSync(updatedFilePath, JSON.stringify(content));
    }
  }

  return new Benchmark('Realistic Cache Benchmark', {
    iterations: ITERATIONS,
  })
    .withAction(() => {
      updateProject();
      execSync(`npx nx show projects`, execSyncOptions);
    })
    .withSetup(() => {
      execSync(`npx nx reset`, execSyncOptions);
      execSync(`npx nx show projects`, execSyncOptions);
    })
    .withTeardown(() => {
      unlinkSync(updatedFilePath);
    });
})();

new Suite('Cache Benchmark Suite')
  .addBenchmark(warmCacheBenchmark)
  .addBenchmark(coldCacheBenchmark)
  .addBenchmark(noCacheBenchmark)
  // .addBenchmark(realisticCacheBenchmark)
  .addVariations(
    Variation.FromEnvironmentVariables([
      ['NX_DAEMON', ['true', 'false']],
      ['NX_ISOLATE_PLUGINS', ['true', 'false']],
    ]),
  )
  .run();
