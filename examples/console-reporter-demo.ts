// ---
// id: console-reporter-demo
// title: Console Reporter Demo
// e2e_skip: true
// description: |
//   This example demonstrates the enhanced console reporter with alt screen support,
//   responsive layout, and smart table rendering.
//
//   To see the alt screen and real-time progress dashboard, run in an interactive terminal:
//   `npx tsx examples/console-reporter-demo.ts`
//
//   Resize your terminal during the run to see responsive layout changes:
//   - 80+ columns: Full table format
//   - 60-79 columns: Compact horizontal format
//   - &lt;60 columns: Simple vertical format
// ---

import { benchmark, suite, variation } from 'flexi-bench';

suite('Console Reporter Demo', () => {
  benchmark('Array Operations', (b) => {
    b.withIterations(50);

    variation('push', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    });

    variation('unshift', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 75));
      });
    });

    variation('spread', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });
    });
  });

  benchmark('String Operations', (b) => {
    b.withIterations(50);

    variation('concat', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    });

    variation('template literal', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 35));
      });
    });

    variation('array join', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    });
  });

  benchmark('Async Operations', (b) => {
    b.withIterations(50);

    variation('setTimeout 0ms', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    });

    variation('setTimeout 10ms', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    });

    variation('setImmediate', () => {
      b.withAction(() => {
        return new Promise((resolve) => setImmediate(resolve));
      });
    });
  });

  benchmark('Math Operations', (b) => {
    b.withIterations(50);

    variation('basic arithmetic', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    });

    variation('Math.sqrt', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
      });
    });

    variation('Math.pow', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    });
  });

  benchmark('Object Operations', (b) => {
    b.withIterations(50);

    variation('property access', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 45));
      });
    });

    variation('spread assignment', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 55));
      });
    });

    variation('Object.keys iteration', () => {
      b.withAction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    });
  });
});
