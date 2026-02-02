import assert from 'assert';
import { describe, it } from 'node:test';
import {
  benchmark,
  setup,
  setupEach,
  suite,
  teardown,
  teardownEach,
  variation,
  xbenchmark,
  xsuite,
  xvariation,
} from './benchmark-runner';
import { NoopReporter } from './reporters/noop-reporter';

const reporter = new NoopReporter();

describe('BenchmarkRunner', () => {
  it('should run benchmarks', async () => {
    let ran = 0;
    let results = await benchmark('My Benchmark', (b) =>
      b
        .withAction(async () => {
          ran++;
        })
        .withIterations(5)
        .withReporter(reporter),
    );

    assert.equal(ran, 5);
    assert.equal(results?.length, 1, 'Should return results');
  });

  it('should run suites', async () => {
    let results = await suite('My Suite', (s) => {
      s.withReporter(reporter).withBenchmarkReporter(reporter);

      benchmark('foo', (foo) => {
        foo.withAction(() => {});
        foo.withIterations(1);
      });

      benchmark('bar', (bar) => {
        bar.withAction(() => {});
        bar.withIterations(2);

        variation('baz', () => {});

        variation('bam', () => {});
      });
    });

    assert.deepEqual(Object.keys(results), ['foo', 'bar']);
    assert.deepEqual(results['foo'].length, 1);
    assert.deepEqual(
      results['bar'].map((v) => v.label),
      ['baz', 'bam'],
    );
  });

  it('should run variations', async () => {
    let results = await suite('Variation Suite', (s) => {
      s.withReporter(reporter).withBenchmarkReporter(reporter);

      benchmark('Variation Benchmark', (b) => {
        b.withAction(() => {}).withIterations(1);

        variation('Variation 1', () => {});
        variation('Variation 2', () => {});
        variation('Variation 3', () => {});
      });
    });
    assert.deepEqual(Object.keys(results), ['Variation Benchmark']);
    assert.deepEqual(
      results['Variation Benchmark'].map((v) => v.label),
      ['Variation 1', 'Variation 2', 'Variation 3'],
    );
  });

  it('should run setup and teardown methods', async () => {
    let setupCount = 0;
    let teardownCount = 0;
    let results = await suite('Setup and Teardown Suite', (s) => {
      s.withReporter(reporter).withBenchmarkReporter(reporter);
      benchmark('Setup and Teardown Benchmark', (b) => {
        setup(() => {
          setupCount++;
        });
        teardown(() => {
          teardownCount++;
        });

        b.withAction(() => {}).withIterations(1);

        variation('v1', () => {});
        variation('v2', () => {});
        variation('v3', () => {});
      });
    });
    assert.equal(setupCount, 3);
    assert.equal(teardownCount, 3);
    assert.deepEqual(Object.keys(results), ['Setup and Teardown Benchmark']);
  });

  it('should run setupEach and teardownEach methods', async () => {
    let setupEachCount = 0;
    let teardownEachCount = 0;
    let results = await suite('SetupEach and TeardownEach Suite', (s) => {
      s.withReporter(reporter).withBenchmarkReporter(reporter);
      benchmark('SetupEach and TeardownEach Benchmark', (b) => {
        setupEach(() => {
          setupEachCount++;
        });
        teardownEach(() => {
          teardownEachCount++;
        });

        b.withAction(() => {}).withIterations(2);

        variation('v1', () => {});
        variation('v2', () => {});
      });
    });
    assert.equal(setupEachCount, 4);
    assert.equal(teardownEachCount, 4);
    assert.deepEqual(Object.keys(results), [
      'SetupEach and TeardownEach Benchmark',
    ]);
  });

  it('should skip disabled benchmarks', async () => {
    let ran = 0;
    let results = await suite('Disabled Benchmark Suite', (s) => {
      s.withReporter(reporter).withBenchmarkReporter(reporter);
      xbenchmark('Disabled Benchmark', () => {
        ran++;
      });
      benchmark('Enabled Benchmark', (b) =>
        b.withIterations(1).withAction(() => {
          ran++;
        }),
      );
    });
    assert.equal(ran, 1);
    assert.deepEqual(Object.keys(results), ['Enabled Benchmark']);
  });

  it('should skip disabled suites', async () => {
    let ran = 0;
    await xsuite('Disabled Suite', () => {
      benchmark('Enabled benchmark', (b) =>
        b.withAction(() => {
          ran++;
        }),
      );
    });
    assert.equal(ran, 0);
  });

  it('should skip disabled variations', async () => {
    let ran = 0;
    let results = await suite('Disabled Variation Suite', (s) => {
      s.withReporter(reporter).withBenchmarkReporter(reporter);
      benchmark('Enabled Benchmark', (b) => {
        b.withAction(() => {
          ran++;
        }).withIterations(1);

        variation('Enabled Variation', () => {});
        xvariation('Disabled Variation', () => {});
      });
    });
    assert.equal(ran, 1);
    assert.deepEqual(Object.keys(results), ['Enabled Benchmark']);
  });

  it('should work with async declarations', async () => {
    const [fooResults, bazResults] = await Promise.all([
      suite('foo', async (s) => {
        s.withReporter(reporter).withBenchmarkReporter(reporter);
        benchmark('foo', async (b) => {
          b.withAction(() => {});
        });
      }),
      suite('baz', async (s) => {
        s.withReporter(reporter).withBenchmarkReporter(reporter);
        benchmark('baz', async (b) => {
          b.withAction(() => {});
        });
      }),
    ]);
    assert.deepEqual(Object.keys(fooResults), ['foo']);
    assert.deepEqual(Object.keys(bazResults), ['baz']);
  });

  it('should demonstrate sequential execution of standalone benchmarks with conflicting env vars', async () => {
    const executionTimeline: string[] = [];

    benchmark('Standalone Benchmark 1', (b) =>
      b
        .withAction(async () => {
          process.env.BENCHMARK_ID = 'bench1';
          executionTimeline.push('bench1-set-env');
          await new Promise((resolve) => setTimeout(resolve, 100));
          const id = process.env.BENCHMARK_ID;
          executionTimeline.push(`bench1-got-env-${id}`);
          if (id !== 'bench1') {
            executionTimeline.push(`bench1-concurrency-error-expected-${id}`);
          }
        })
        .withIterations(1)
        .withReporter(reporter),
    );

    benchmark('Standalone Benchmark 2', (b) =>
      b
        .withAction(async () => {
          process.env.BENCHMARK_ID = 'bench2';
          executionTimeline.push('bench2-set-env');
          await new Promise((resolve) => setTimeout(resolve, 100));
          const id = process.env.BENCHMARK_ID;
          executionTimeline.push(`bench2-got-env-${id}`);
          if (id !== 'bench2') {
            executionTimeline.push(`bench2-concurrency-error-expected-${id}`);
          }
        })
        .withIterations(1)
        .withReporter(reporter),
    );

    await new Promise((resolve) => setTimeout(resolve, 250));

    assert.ok(
      !executionTimeline.some((t) => t.includes('concurrency-error')),
      'No benchmarks should have concurrency issues - they should run sequentially',
    );

    const bench1Errors = executionTimeline.filter((t) =>
      t.includes('bench1-concurrency-error'),
    );
    const bench2Errors = executionTimeline.filter((t) =>
      t.includes('bench2-concurrency-error'),
    );

    assert.ok(
      bench1Errors.length === 0 && bench2Errors.length === 0,
      'Both benchmarks should have run without detecting concurrent execution issue',
    );
  });
});
