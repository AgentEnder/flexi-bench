import { describe, expect, it } from 'vitest';
import { Variation } from './variation';

describe('Variation', () => {
  describe('FromCliArgs', () => {
    it('should create one variation for each possible combination of cli args', () => {
      const variations = Variation.FromCliArgs([
        '--flag',
        ['--no-daemon', '--daemon'],
      ]);

      expect(variations.map((v) => v.name)).toEqual([
        '--flag --no-daemon',
        '--flag --daemon',
      ]);
    });
  });

  describe('FromEnvironmentVariables', () => {
    it('should create one variation for each possible combination of environment variables', () => {
      const variations = Variation.FromEnvironmentVariables([
        ['A', ['1', '2']],
        ['B', ['3', '4']],
      ]);

      expect(variations.map((v) => v.environment)).toEqual([
        { A: '1', B: '3' },
        { A: '1', B: '4' },
        { A: '2', B: '3' },
        { A: '2', B: '4' },
      ]);
    });
  });

  describe('FromContext', () => {
    it('should create variations with context values', () => {
      const processorA = { name: 'A' };
      const processorB = { name: 'B' };

      const variations = Variation.FromContexts('processor', [
        ['loop', processorA],
        ['reduce', processorB],
      ]);

      expect(variations).toHaveLength(2);
      expect(variations[0].name).toBe('loop');
      expect(variations[1].name).toBe('reduce');
      expect(variations[0].get('processor')).toBe(processorA);
      expect(variations[1].get('processor')).toBe(processorB);
    });

    it('should work with primitive values', () => {
      const variations = Variation.FromContexts('iterations', [
        ['fast', 10],
        ['slow', 100],
      ]);

      expect(variations[0].get<number>('iterations')).toBe(10);
      expect(variations[1].get<number>('iterations')).toBe(100);
    });

    it('should handle empty array', () => {
      const variations = Variation.FromContexts('key', []);
      expect(variations).toHaveLength(0);
    });

    it('should handle single variation', () => {
      const variations = Variation.FromContexts('config', [
        ['single', { debug: true }],
      ]);
      expect(variations).toHaveLength(1);
      expect(variations[0].name).toBe('single');
      expect(variations[0].get('config')).toEqual({ debug: true });
    });
  });

  describe('Context', () => {
    it('should set and get context values', () => {
      const variation = new Variation('test').withContext('key', 'value');
      expect(variation.get('key')).toBe('value');
    });

    it('should return undefined for missing context keys', () => {
      const variation = new Variation('test');
      expect(variation.get('missing')).toBeUndefined();
    });

    it('should support typed context values', () => {
      interface TestData {
        value: number;
        name: string;
      }
      const data: TestData = { value: 42, name: 'test' };
      const variation = new Variation('test').withContext('data', data);

      const retrieved = variation.get<TestData>('data');
      expect(retrieved).toEqual(data);
    });

    it('should support getOrDefault with existing key', () => {
      const variation = new Variation('test').withContext('key', 100);
      expect(variation.getOrDefault('key', 50)).toBe(100);
    });

    it('should support getOrDefault with missing key', () => {
      const variation = new Variation('test');
      expect(variation.getOrDefault('key', 50)).toBe(50);
    });

    it('should allow chaining multiple context values', () => {
      const variation = new Variation('test')
        .withContext('a', 1)
        .withContext('b', 2)
        .withContext('c', 3);

      expect(variation.get('a')).toBe(1);
      expect(variation.get('b')).toBe(2);
      expect(variation.get('c')).toBe(3);
    });

    it('should allow overwriting context values', () => {
      const variation = new Variation('test')
        .withContext('key', 'first')
        .withContext('key', 'second');

      expect(variation.get('key')).toBe('second');
    });
  });
});
