// ---
// id: runner-api
// title: Runner API
// sidebar_label: Runner API
// description: |
//   FlexiBench provides a simple API to define benchmarks and suites based on some common testing tools.
//   This example demonstrates how to use the Runner API to define a suite with a benchmark and some setup and teardown functions.
// ---

import {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  benchmark,
  suite,
} from '../src/benchmark-runner';

suite('My Suite', () => {
  benchmark('My Benchmark', (benchmark) => {
    beforeAll(() => {
      console.log('Before All');
    });

    beforeEach(() => {
      console.log('Before Each');
    });

    afterEach(() => {
      console.log('After Each');
    });

    afterAll(() => {
      console.log('After All');
    });

    benchmark.withIterations(2).withAction(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    benchmark.withReporter({ report: (results) => {} });
  });
});
