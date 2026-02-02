import { appendFileSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import { h1, h2, h3, lines, table } from 'markdown-factory';
import { BenchmarkReporter } from '../api-types';
import { Benchmark } from '../benchmark';
import { Result } from '../results';

interface ComparisonEntry {
  label: string;
  indicator: string;
  [key: string]: string;
}

export class MarkdownBenchmarkReporter implements BenchmarkReporter {
  outputFile: string;
  fields: Array<keyof Omit<Result, 'subresults' | 'label' | 'raw'>>;
  append: boolean;
  private isFirstReport: boolean = true;
  private accumulatedResults: Map<string, Result[]> = new Map();

  constructor(opts: {
    outputFile: string;
    fields?: MarkdownBenchmarkReporter['fields'];
    append?: boolean;
  }) {
    this.outputFile = opts.outputFile;
    this.fields = opts.fields ?? ['min', 'average', 'p95', 'max'];
    this.append = opts.append ?? false;
  }

  private formatDuration(value: number | undefined): string {
    if (value === undefined) return '';

    const totalMs = value;

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const remainingAfterHours = totalMs % (1000 * 60 * 60);

    const minutes = Math.floor(remainingAfterHours / (1000 * 60));
    const remainingAfterMinutes = remainingAfterHours % (1000 * 60);

    const seconds = Math.floor(remainingAfterMinutes / 1000);
    const milliseconds = remainingAfterMinutes % 1000;

    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || milliseconds > 0) {
        const totalSeconds = seconds + milliseconds / 1000;
        parts.push(`${totalSeconds.toFixed(1)}s`);
      }
    } else if (minutes > 0) {
      parts.push(`${minutes}m`);
      if (seconds > 0 || milliseconds > 0) {
        const totalSeconds = seconds + milliseconds / 1000;
        parts.push(`${totalSeconds.toFixed(1)}s`);
      }
    } else if (seconds > 0) {
      const totalSeconds = seconds + milliseconds / 1000;
      parts.push(`${totalSeconds.toFixed(1)}s`);
    } else {
      parts.push(`${milliseconds.toFixed(1)}ms`);
    }

    return parts.join(' ');
  }

  report: (benchmark: Benchmark, results: Result[]) => void = (
    benchmark,
    results,
  ) => {
    if (this.append) {
      // In append mode, accumulate results and write incrementally
      this.accumulatedResults.set(benchmark.name, results);
      const content = this.generateBenchmarkContent(benchmark, results);

      if (this.isFirstReport) {
        // First report: clear the file and write header
        writeFileSync(this.outputFile, content);
        this.isFirstReport = false;
      } else {
        // Subsequent reports: append with a separator
        appendFileSync(this.outputFile, '\n\n---\n\n' + content);
      }
    } else {
      // Legacy mode: overwrite file (useful for single benchmark reporting)
      writeFileSync(
        this.outputFile,
        this.generateBenchmarkContent(benchmark, results),
      );
    }
  };

  private generateBenchmarkContent(
    benchmark: Benchmark,
    results: Result[],
  ): string {
    const sections: string[] = [];

    // Main results section
    sections.push(this.generateResultsTable(results));

    // Comparison section (if multiple variations)
    if (results.length > 1) {
      sections.push(this.generateComparison(results));
    }

    return h1(benchmark.name, lines(sections));
  }

  private generateResultsTable(results: Result[]): string {
    const fieldConfigs: Array<{
      field: keyof Result;
      label: string;
      mapFn?: (item: Result) => string;
    }> = [
      { field: 'label', label: '' },
      ...this.fields.map((field) => ({
        field: field as keyof Result,
        label: field,
        mapFn: (item: Result) => {
          const value = item[field];
          if (field === 'iterations') {
            return String(value ?? '');
          }
          if (typeof value === 'number') {
            return this.formatDuration(value);
          }
          return String(value ?? '');
        },
      })),
    ];

    if (results.some((r) => !!r.subresults)) {
      return lines(
        results.map((r) => {
          const entries: Result[] = [{ ...r, label: 'total' }];
          delete entries[0].subresults;
          for (const subresult of r.subresults ?? []) {
            entries.push(subresult);
          }
          return h2(r.label, table(entries, fieldConfigs));
        }),
      );
    }

    return table(results, fieldConfigs);
  }

  private generateComparison(results: Result[]): string {
    const sorted = [...results].sort((a, b) => a.average - b.average);
    const fastest = sorted[0];

    const hasVaryingIterations = results.some(
      (r) => r.iterations !== results[0].iterations,
    );

    const entries: ComparisonEntry[] = sorted.map((result, index) => {
      const entry: ComparisonEntry = {
        label: result.label,
        indicator: index === 0 ? '🏆' : '',
      };

      for (const field of this.fields) {
        if (field === 'iterations') {
          if (hasVaryingIterations) {
            entry.iterations = String(result.iterations);
          }
        } else {
          const value = result[field] as number;
          const fastestValue = fastest[field] as number;
          if (index === 0) {
            entry[field] = 'baseline';
          } else {
            const faster = value < fastestValue;

            const factor = faster ? fastestValue / value : value / fastestValue;

            if (factor < 1.05) {
              entry[field] = '≈';
              continue;
            } else {
              entry[field] =
                `${factor.toFixed(2)}x ${faster ? 'faster' : 'slower'}`;
            }
          }
        }
      }

      return entry;
    });

    const columns = [
      { field: 'label', label: 'Variation' },
      ...this.fields
        .filter((field) => field !== 'iterations' || hasVaryingIterations)
        .map((field) => ({ field, label: field })),
      { field: 'indicator', label: '' },
    ];

    const header = hasVaryingIterations
      ? 'Comparison'
      : `Comparison (${results[0].iterations} iterations)`;

    return h3(
      header,
      table(
        entries.map((e) => ({ ...e })),
        columns,
      ),
    );
  }

  /**
   * Clears the output file. Useful when re-running benchmarks.
   */
  clear(): void {
    if (existsSync(this.outputFile)) {
      unlinkSync(this.outputFile);
    }
    this.isFirstReport = true;
    this.accumulatedResults.clear();
  }
}
