import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DurationMeasure,
  MemoryMeasure,
  createMeasure,
} from './measure';

describe('DurationMeasure', () => {
  it('should have correct label and type', () => {
    assert.strictEqual(DurationMeasure.label, 'duration');
    assert.strictEqual(DurationMeasure.type, 'time');
  });

  it('should measure elapsed time', async () => {
    const start = DurationMeasure.start();
    await new Promise((r) => setTimeout(r, 50));
    const elapsed = DurationMeasure.end(start);

    assert.ok(elapsed >= 40, `Expected >= 40ms, got ${elapsed}ms`);
    assert.ok(elapsed < 200, `Expected < 200ms, got ${elapsed}ms`);
  });
});

describe('MemoryMeasure', () => {
  it('should have correct labels and types', () => {
    assert.strictEqual(MemoryMeasure.rss.label, 'memory:rss');
    assert.strictEqual(MemoryMeasure.rss.type, 'size');

    assert.strictEqual(MemoryMeasure.heapUsed.label, 'memory:heap_used');
    assert.strictEqual(MemoryMeasure.heapUsed.type, 'size');

    assert.strictEqual(MemoryMeasure.heapTotal.label, 'memory:heap_total');
    assert.strictEqual(MemoryMeasure.heapTotal.type, 'size');

    assert.strictEqual(MemoryMeasure.external.label, 'memory:external');
    assert.strictEqual(MemoryMeasure.external.type, 'size');

    assert.strictEqual(MemoryMeasure.arrayBuffers.label, 'memory:array_buffers');
    assert.strictEqual(MemoryMeasure.arrayBuffers.type, 'size');
  });

  it('should measure heap memory delta', () => {
    const baseline = MemoryMeasure.heapUsed.start();

    // Allocate some memory
    const arr = new Array(10000).fill('x'.repeat(100));

    const delta = MemoryMeasure.heapUsed.end(baseline);

    // Delta should be non-negative (clamped to 0 if GC runs)
    assert.ok(typeof delta === 'number', 'Delta should be a number');
    assert.ok(delta >= 0, 'Delta should be >= 0 (clamped)');

    // Clean up
    arr.length = 0;
  });

  it('should clamp negative deltas to zero', () => {
    // Simulate a scenario where memory decreased (GC ran)
    // by creating a fake baseline with higher values
    const fakeBaseline: NodeJS.MemoryUsage = {
      rss: Number.MAX_SAFE_INTEGER,
      heapTotal: Number.MAX_SAFE_INTEGER,
      heapUsed: Number.MAX_SAFE_INTEGER,
      external: Number.MAX_SAFE_INTEGER,
      arrayBuffers: Number.MAX_SAFE_INTEGER,
    };

    const delta = MemoryMeasure.heapUsed.end(fakeBaseline);

    // Should be clamped to 0, not a large negative number
    assert.strictEqual(delta, 0, 'Negative delta should be clamped to 0');
  });

  it('should measure ArrayBuffer memory', () => {
    const baseline = MemoryMeasure.arrayBuffers.start();

    // Allocate an ArrayBuffer
    const buffer = new ArrayBuffer(1024 * 1024); // 1MB
    const view = new Uint8Array(buffer);
    view.fill(42);

    const delta = MemoryMeasure.arrayBuffers.end(baseline);

    // Should detect the 1MB allocation
    assert.ok(delta >= 1024 * 1024 - 1024, `Expected ~1MB delta, got ${delta}`);
  });
});

describe('createMeasure', () => {
  it('should create a custom measure', () => {
    let counter = 0;

    const CounterMeasure = createMeasure({
      label: 'counter',
      start: () => counter,
      end: (startCount) => {
        counter += 5;
        return counter - startCount;
      },
    });

    assert.strictEqual(CounterMeasure.label, 'counter');
    assert.strictEqual(CounterMeasure.type, undefined);

    const start = CounterMeasure.start();
    const result = CounterMeasure.end(start);

    assert.strictEqual(result, 5);
  });

  it('should support custom type', () => {
    const CustomMeasure = createMeasure({
      label: 'custom',
      type: 'size',
      start: () => 0,
      end: () => 1024,
    });

    assert.strictEqual(CustomMeasure.type, 'size');
  });
});
