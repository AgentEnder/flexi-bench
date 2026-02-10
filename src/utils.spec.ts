import { describe, expect, it } from 'vitest';
import { findCombinations } from './utils';

describe('findCombinations', () => {
  it('should return all combinations', () => {
    const result = findCombinations([
      ['1', '2'],
      ['3', '4'],
    ]);

    expect(result).toEqual([
      ['1', '3'],
      ['1', '4'],
      ['2', '3'],
      ['2', '4'],
    ]);
  });

  it('should handle odd number of variables', () => {
    const result = findCombinations([['1', '2'], ['3']]);

    expect(result).toEqual([
      ['1', '3'],
      ['2', '3'],
    ]);

    const result2 = findCombinations([
      ['1', '2', '3'],
      ['3', '4'],
    ]);

    expect(result2).toEqual([
      ['1', '3'],
      ['1', '4'],
      ['2', '3'],
      ['2', '4'],
      ['3', '3'],
      ['3', '4'],
    ]);
  });
});
