import { it, describe } from 'node:test';
import { deepEqual } from 'node:assert';

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
});
