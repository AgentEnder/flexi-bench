import { BenchmarkReporter, SuiteReporter } from '../api-types';

export class NoopReporter implements BenchmarkReporter, SuiteReporter {
  report: () => void = () => {};
}
