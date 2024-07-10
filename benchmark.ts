import { ExecSyncOptions, execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Benchmark, Variation } from './src/index';

const ITERATIONS = 20;

const execSyncOptions: ExecSyncOptions = {
  stdio: 'ignore',
  shell: true as any,
};

function addVariations(benchmark: Benchmark) {
  benchmark.withVariations(
    Variation.FromEnvironmentVariables([
      ['NX_DAEMON', ['true', 'false']],
      ['NX_ISOLATE_PLUGINS', ['true', 'false']],
    ]),
  );
}

/**
 * Benchmarks when the cache has already been warmed before any iterations.
 */
async function warmCacheBenchmark() {
  let benchmark = new Benchmark('Warm Cache Benchmark', {
    iterations: ITERATIONS,
  });
  addVariations(benchmark);
  benchmark.withAction(() => {
    execSync(`npx nx show projects`, execSyncOptions);
  });
  benchmark.withSetup(() => {
    execSync(`npx nx reset`, execSyncOptions);
    execSync(`npx nx show projects`, execSyncOptions);
  });
  await benchmark.run();
}

/**
 * Benchmarks when the cache has not been warmed before any iterations.
 * In this case, the first iteration will do the majority of the work
 * to warm the cache.
 */
async function coldCacheBenchmark() {
  let benchmark = new Benchmark('Cold Cache Benchmark', {
    iterations: ITERATIONS,
  });
  addVariations(benchmark);
  benchmark.withAction(() => {
    execSync(`npx nx show projects`, execSyncOptions);
  });
  benchmark.withSetup(() => {
    execSync(`npx nx reset`, execSyncOptions);
  });
  await benchmark.run();
}

/**
 * Benchmarks with killing the cache and daemon before each iteration.
 * This represents a scenario where the cache is not used at all.
 */
async function noCacheBenchmark() {
  let benchmark = new Benchmark('No Cache Benchmark', {
    iterations: ITERATIONS,
  });
  addVariations(benchmark);
  benchmark.withAction(() => {
    execSync(`npx nx reset`, execSyncOptions);
    execSync(`npx nx show projects`, execSyncOptions);
  });
  await benchmark.run();
}

/**
 * Benchmarks with a realistic cache scenario where the cache is used but one project
 * is changed between each iteration.
 */
async function realisticCacheBenchmark() {
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

  let benchmark = new Benchmark('Realistic Cache Benchmark', {
    iterations: ITERATIONS,
  });
  addVariations(benchmark);
  benchmark.withAction(() => {
    updateProject();
    execSync(`npx nx show projects`, execSyncOptions);
  });
  benchmark.withSetup(() => {
    execSync(`npx nx reset`, execSyncOptions);
    execSync(`npx nx show projects`, execSyncOptions);
  });
  benchmark.withTeardown(() => {
    unlinkSync(updatedFilePath);
  });
  await benchmark.run();
}

warmCacheBenchmark();
