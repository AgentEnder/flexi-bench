import { SuiteReporter } from '../api-types';
import { Result } from '../results';

export class SuiteConsoleReporter implements SuiteReporter {
  report: (results: Record<string, Result[]>) => void = (results) => {
    console.log('Suite Results:');
    for (const [name, result] of Object.entries(results)) {
      console.log(`Benchmark: ${name}`);
      console.table(result);
    }
  };
}
