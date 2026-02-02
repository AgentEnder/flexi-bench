import { deepEqual, equal } from 'node:assert';
import { describe, it } from 'node:test';

import { Variation } from './variation';

describe('Variation', () => {
  describe('FromCliArgs', () => {
    it('should create one variation for each possible combination of cli args', () => {
      const variations = Variation.FromCliArgs([
        '--flag',
        ['--no-daemon', '--daemon'],
      ]);

      deepEqual(
        variations.map((v) => v.name),
        ['--flag --no-daemon', '--flag --daemon'],
      );
    });
  });

  describe('FromEnvironmentVariables', () => {
    it('should create one variation for each possible combination of environment variables', () => {
      const variations = Variation.FromEnvironmentVariables([
        ['A', ['1', '2']],
        ['B', ['3', '4']],
      ]);

      deepEqual(
        variations.map((v) => v.environment),
        [
          { A: '1', B: '3' },
          { A: '1', B: '4' },
          { A: '2', B: '3' },
          { A: '2', B: '4' },
        ],
      );
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

      equal(variations.length, 2);
      equal(variations[0].name, 'loop');
      equal(variations[1].name, 'reduce');
      equal(variations[0].get('processor'), processorA);
      equal(variations[1].get('processor'), processorB);
    });

    it('should work with primitive values', () => {
      const variations = Variation.FromContexts('iterations', [
        ['fast', 10],
        ['slow', 100],
      ]);

      equal(variations[0].get<number>('iterations'), 10);
      equal(variations[1].get<number>('iterations'), 100);
    });

    it('should handle empty array', () => {
      const variations = Variation.FromContexts('key', []);
      equal(variations.length, 0);
    });

    it('should handle single variation', () => {
      const variations = Variation.FromContexts('config', [
        ['single', { debug: true }],
      ]);
      equal(variations.length, 1);
      equal(variations[0].name, 'single');
      deepEqual(variations[0].get('config'), { debug: true });
    });
  });

  describe('Context', () => {
    it('should set and get context values', () => {
      const variation = new Variation('test').withContext('key', 'value');
      equal(variation.get('key'), 'value');
    });

    it('should return undefined for missing context keys', () => {
      const variation = new Variation('test');
      equal(variation.get('missing'), undefined);
    });

    it('should support typed context values', () => {
      interface TestData {
        value: number;
        name: string;
      }
      const data: TestData = { value: 42, name: 'test' };
      const variation = new Variation('test').withContext('data', data);

      const retrieved = variation.get<TestData>('data');
      deepEqual(retrieved, data);
    });

    it('should support getOrDefault with existing key', () => {
      const variation = new Variation('test').withContext('key', 100);
      equal(variation.getOrDefault('key', 50), 100);
    });

    it('should support getOrDefault with missing key', () => {
      const variation = new Variation('test');
      equal(variation.getOrDefault('key', 50), 50);
    });

    it('should allow chaining multiple context values', () => {
      const variation = new Variation('test')
        .withContext('a', 1)
        .withContext('b', 2)
        .withContext('c', 3);

      equal(variation.get('a'), 1);
      equal(variation.get('b'), 2);
      equal(variation.get('c'), 3);
    });

    it('should allow overwriting context values', () => {
      const variation = new Variation('test')
        .withContext('key', 'first')
        .withContext('key', 'second');

      equal(variation.get('key'), 'second');
    });
  });
});
