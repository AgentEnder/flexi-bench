import { describe, expect, it } from 'vitest';
import { DurationMeasure, MemoryMeasure, createMeasure } from './measure';

describe('DurationMeasure', () => {
  it('should have correct label and type', () => {
    expect(DurationMeasure.label).toBe('duration');
    expect(DurationMeasure.type).toBe('time');
  });

  it('should measure elapsed time', async () => {
    const start = DurationMeasure.start();
    await new Promise((r) => setTimeout(r, 50));
    const elapsed = DurationMeasure.end(start);

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(200);
  });
});

describe('MemoryMeasure', () => {
  it('should have correct labels and types', () => {
    expect(MemoryMeasure.rss.label).toBe('memory:rss');
    expect(MemoryMeasure.rss.type).toBe('size');

    expect(MemoryMeasure.heapUsed.label).toBe('memory:heap_used');
    expect(MemoryMeasure.heapUsed.type).toBe('size');

    expect(MemoryMeasure.heapTotal.label).toBe('memory:heap_total');
    expect(MemoryMeasure.heapTotal.type).toBe('size');

    expect(MemoryMeasure.external.label).toBe('memory:external');
    expect(MemoryMeasure.external.type).toBe('size');

    expect(MemoryMeasure.arrayBuffers.label).toBe('memory:array_buffers');
    expect(MemoryMeasure.arrayBuffers.type).toBe('size');
  });

  it('should measure heap memory delta', () => {
    const baseline = MemoryMeasure.heapUsed.start();

    // Allocate some memory
    const arr = new Array(10000).fill('x'.repeat(100));

    const delta = MemoryMeasure.heapUsed.end(baseline);

    expect(typeof delta).toBe('number');
    expect(delta).toBeGreaterThanOrEqual(0);

    // Clean up
    arr.length = 0;
  });

  it('should clamp negative deltas to zero', () => {
    const fakeBaseline: NodeJS.MemoryUsage = {
      rss: Number.MAX_SAFE_INTEGER,
      heapTotal: Number.MAX_SAFE_INTEGER,
      heapUsed: Number.MAX_SAFE_INTEGER,
      external: Number.MAX_SAFE_INTEGER,
      arrayBuffers: Number.MAX_SAFE_INTEGER,
    };

    const delta = MemoryMeasure.heapUsed.end(fakeBaseline);
    expect(delta).toBe(0);
  });

  it('should measure ArrayBuffer memory', () => {
    const baseline = MemoryMeasure.arrayBuffers.start();

    const buffer = new ArrayBuffer(1024 * 1024); // 1MB
    const view = new Uint8Array(buffer);
    view.fill(42);

    const delta = MemoryMeasure.arrayBuffers.end(baseline);
    expect(delta).toBeGreaterThanOrEqual(1024 * 1024 - 1024);
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

    expect(CounterMeasure.label).toBe('counter');
    expect(CounterMeasure.type).toBeUndefined();

    const start = CounterMeasure.start();
    const result = CounterMeasure.end(start);

    expect(result).toBe(5);
  });

  it('should support custom type', () => {
    const CustomMeasure = createMeasure({
      label: 'custom',
      type: 'size',
      start: () => 0,
      end: () => 1024,
    });

    expect(CustomMeasure.type).toBe('size');
  });
});
