import { writeFileSync } from 'fs';
import { SuiteReporter } from '../api-types';
import { Result } from '../results';

export interface JsonSuiteReporterOptions {
  outputFile: string;
  pretty?: boolean;
  includeMetadata?: boolean;
}

/**
 * A reporter that outputs benchmark results as JSON.
 * Useful for CI/CD integration and programmatic analysis.
 *
 * @example
 * ```typescript
 * suite.withReporter(new JsonSuiteReporter({
 *   outputFile: 'results.json',
 *   pretty: true,
 * }))
 * ```
 */
export class JsonSuiteReporter implements SuiteReporter {
  private outputFile: string;
  private pretty: boolean;
  private includeMetadata: boolean;

  constructor(opts: JsonSuiteReporterOptions) {
    this.outputFile = opts.outputFile;
    this.pretty = opts.pretty ?? false;
    this.includeMetadata = opts.includeMetadata ?? true;
  }

  report: (results: Record<string, Result[]>) => void = (results) => {
    const output = this.includeMetadata
      ? {
          timestamp: new Date().toISOString(),
          platform: process.platform,
          nodeVersion: process.version,
          results,
        }
      : results;

    writeFileSync(
      this.outputFile,
      JSON.stringify(output, null, this.pretty ? 2 : undefined),
    );
  };
}
