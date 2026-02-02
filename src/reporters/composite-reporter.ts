import { SuiteReporter } from '../api-types';
import { Result } from '../results';

/**
 * A reporter that chains multiple suite reporters together.
 * Useful when you want to output results to multiple destinations
 * (e.g., console and file) simultaneously.
 *
 * @example
 * ```typescript
 * suite.withReporter(new CompositeReporter([
 *   new SuiteConsoleReporter(),
 *   new MarkdownSuiteReporter({ outputFile: 'results.md' }),
 *   new JsonSuiteReporter({ outputFile: 'results.json' }),
 * ]))
 * ```
 */
export class CompositeReporter implements SuiteReporter {
  constructor(private reporters: SuiteReporter[]) {}

  report: (results: Record<string, Result[]>) => void = (results) => {
    for (const reporter of this.reporters) {
      reporter.report(results);
    }
  };
}
