import { describe, expect, it } from 'vitest';
import { DisjointMap, Lazy } from './types';

describe('Lazy', () => {
  it('should not execute until awaited', async () => {
    let lazyExecuted = false;
    let eagerExecuted = false;
    const lazy = new Lazy(async () => {
      lazyExecuted = true;
      return 42;
    });
    const eager = new Promise((resolve) => {
      eagerExecuted = true;
      resolve(42);
    });

    expect(lazyExecuted).toBe(false);
    expect(eagerExecuted).toBe(true);

    const result = await lazy;
    const eagerResult = await eager;
    expect(lazyExecuted).toBe(true);
    expect(result).toBe(42);
    expect(eagerResult).toBe(42);
  });

  it('should work with resolve/reject executor style', async () => {
    const lazy = new Lazy<string>((resolve) => {
      resolve('hello');
    });

    const result = await lazy;
    expect(result).toBe('hello');
  });

  it('should only execute once on multiple awaits', async () => {
    let count = 0;
    const lazy = new Lazy(async () => {
      count++;
      return 'value';
    });

    await lazy;
    await lazy;
    await lazy;

    expect(count).toBe(1);
  });

  it('should propagate rejections', async () => {
    const lazy = new Lazy(async () => {
      throw new Error('test error');
    });

    await expect(lazy).rejects.toThrow('test error');
  });

  it('should support .then() chaining', async () => {
    const lazy = new Lazy(async () => 10);

    const result = await lazy.then((v) => v * 2);
    expect(result).toBe(20);
  });

  it('should support .catch()', async () => {
    const lazy = new Lazy(async () => {
      throw new Error('caught');
    });

    const result = await lazy.catch((e: Error) => e.message);
    expect(result).toBe('caught');
  });

  it('should support .finally()', async () => {
    let finallyCalled = false;
    const lazy = new Lazy(async () => 'done');

    await lazy.finally(() => {
      finallyCalled = true;
    });

    expect(finallyCalled).toBe(true);
  });

  it('should have correct toStringTag', () => {
    const lazy = new Lazy(async () => 1);
    expect(lazy[Symbol.toStringTag]).toBe('Lazy [Promise]');
  });

  it('should work with resolve-style executor that rejects', async () => {
    const lazy = new Lazy<string>((_resolve, reject) => {
      reject(new Error('rejected'));
    });

    await expect(lazy).rejects.toThrow('rejected');
  });
});

describe('DisjointMap', () => {
  it('should store and retrieve values with different key types', () => {
    const map = new DisjointMap<string, number, number, string>();

    map.set('age', 30);
    map.set(1, 'one');

    expect(map.get('age')).toBe(30);
    expect(map.get(1)).toBe('one');
  });

  it('should return undefined for missing keys', () => {
    const map = new DisjointMap<string, number, number, string>();

    expect(map.get('missing')).toBeUndefined();
    expect(map.get(999)).toBeUndefined();
  });

  it('should overwrite values for existing keys', () => {
    const map = new DisjointMap<string, number, number, string>();

    map.set('key', 1);
    map.set('key', 2);

    expect(map.get('key')).toBe(2);
  });

  it('should support iteration via entries()', () => {
    const map = new DisjointMap<string, number, symbol, boolean>();
    const sym = Symbol('test');

    map.set('count', 42);
    map.set(sym, true);

    const entries = [...map.entries()];
    expect(entries).toHaveLength(2);
  });

  it('should inherit Map methods (size, has, delete, clear)', () => {
    const map = new DisjointMap<string, number, number, string>();

    map.set('a', 1);
    map.set(2, 'b');

    expect(map.size).toBe(2);
    expect(map.has('a')).toBe(true);
    expect(map.has(2)).toBe(true);
    expect(map.has('missing')).toBe(false);

    map.delete('a');
    expect(map.size).toBe(1);
    expect(map.has('a')).toBe(false);

    map.clear();
    expect(map.size).toBe(0);
  });
});
