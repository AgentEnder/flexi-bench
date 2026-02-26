// ---
// id: warmup-iterations
// title: Warmup Iterations
// sidebar_label: Warmup Iterations
// description: |
//   Demonstrates using `.withWarmupIterations(...)` to run unmeasured iterations before measured ones.
//   This is useful for warming JIT paths and reducing first-iteration distortion.
// ---
import { benchmark, variation } from 'flexi-bench';

const sizes = {
  small: 1_000,
  large: 100_000,
} as const;

benchmark('Array sum with warmups', (b) => {
  b.withIterations(10)
    .withWarmupIterations(5)
    .withAction((v) => {
      const size = sizes[v.name as keyof typeof sizes];
      const values = Array.from({ length: size }, (_, i) => i);
      return values.reduce((sum, n) => sum + n, 0);
    });

  variation('small', () => {});
  variation('large', (v) => v.withWarmupIterations(8));
});
