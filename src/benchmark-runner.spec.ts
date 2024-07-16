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
import assert from 'assert';

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

  // I'd love for this to work, but it gets more complicated to make benchmarks are
  // assigned to the correct suite. I'll leave this as a todo for now.
  it('should work with async declarations', { todo: true }, async () => {
    let results = Object.fromEntries(
      await Promise.all([
        [
          'foo',
          suite('foo', (async (s) => {
            s.withReporter(reporter).withBenchmarkReporter(reporter);
            benchmark('foo', (async (b) => {
              b.withAction(() => {});
            }) as unknown as any);
          }) as any),
        ],
        [
          'baz',
          suite('baz', (async (s) => {
            s.withReporter(reporter).withBenchmarkReporter(reporter);
            benchmark('baz', (async (b) => {
              b.withAction(() => {});
            }) as any);
          }) as any),
        ],
      ]),
    );
    assert.deepEqual(Object.keys(results), ['foo', 'baz']);
    assert.deepEqual(Object.keys(results['foo']), ['foo']);
    assert.deepEqual(Object.keys(results['baz']), ['baz']);
  });
});
