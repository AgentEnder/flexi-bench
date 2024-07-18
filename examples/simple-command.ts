import { Benchmark, Suite, Variation } from 'flexi-bench';

(async () => {
  const results = await new Suite('Simple Command Example')
    .addBenchmark(
      new Benchmark('CLI Flag Variance', {
        iterations: 2,
        action: 'sleep',
      }).withVariations(Variation.FromCliArgs([['.1', '.01']])),
    )
    .addBenchmark(
      new Benchmark('Environment Variable Variance', {
        iterations: 2,
        action: 'sleep $SLEEP_DURATION',
      }).withVariations(
        Variation.FromEnvironmentVariables([['SLEEP_DURATION', ['.1', '.01']]]),
      ),
    )
    .run();
})();
