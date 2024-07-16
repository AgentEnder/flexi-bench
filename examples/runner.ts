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
