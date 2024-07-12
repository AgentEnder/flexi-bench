import { describe, it } from 'node:test';
import { deepEqual } from 'node:assert';
import { findCombinations } from './utils';

describe('findCombinations', () => {
  it('should return all combinations', () => {
    const result = findCombinations([
      ['1', '2'],
      ['3', '4'],
    ]);

    deepEqual(result, [
      ['1', '3'],
      ['1', '4'],
      ['2', '3'],
      ['2', '4'],
    ]);
  });

  it('should handle odd number of variables', () => {
    const result = findCombinations([['1', '2'], ['3']]);

    deepEqual(result, [
      ['1', '3'],
      ['2', '3'],
    ]);

    const result2 = findCombinations([
      ['1', '2', '3'],
      ['3', '4'],
    ]);

    deepEqual(result2, [
      ['1', '3'],
      ['1', '4'],
      ['2', '3'],
      ['2', '4'],
      ['3', '3'],
      ['3', '4'],
    ]);
  });
});
