import { SuiteReporter } from '../api-types';
import { Result } from '../results';

function getNoColorOption(explicitNoColor?: boolean): boolean {
  if (explicitNoColor !== undefined) {
    return explicitNoColor;
  }
  return process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';
}

export class SuiteConsoleReporter implements SuiteReporter {
  private noColor: boolean;

  constructor(opts?: { noColor?: boolean }) {
    this.noColor = getNoColorOption(opts?.noColor);
  }

  report: (results: Record<string, Result[]>) => void = (results) => {
    if (this.noColor) {
      console.log('Suite Results:');
    } else {
      console.log('\x1b[1mSuite Results:\x1b[0m');
    }
    for (const [name, result] of Object.entries(results)) {
      const tableEntries = result.map(({ raw, ...rest }) => ({
        ...rest,
      }));
      console.log(`Benchmark: ${name}`);
      console.table(tableEntries);
    }
  };
}
