// ---
// id: blackhole-result-sink
// title: Blackhole Result Sink
// sidebar_label: Blackhole Result Sink
// description: |
//   Demonstrates the built-in blackhole behavior for callback return values and
//   optional manual usage via the exported `blackhole(...)` helper.
// ---
import { Benchmark, blackhole } from 'flexi-bench';

function computeChecksum(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

(async () => {
  await new Benchmark('Automatic blackhole on return value')
    .withIterations(50)
    .withAction(() => {
      return computeChecksum('flexi-bench');
    })
    .run();

  await new Benchmark('Manual blackhole usage')
    .withIterations(50)
    .withAction(() => {
      const checksum = computeChecksum('manual-sink');
      blackhole(checksum);
    })
    .run();
})();
