import { appendFileSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import { h1, h2, h3, lines, table } from 'markdown-factory';
import { BenchmarkReporter } from '../api-types';
import { Benchmark } from '../benchmark';
import { Result } from '../results';
import { formatValue } from '../utils/format';

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
            return formatValue(value, item.type);
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
    // Sort by average - lower is better for both time and memory
    const sorted = [...results].sort((a, b) => a.average - b.average);
    const best = sorted[0];

    // Determine comparison terminology based on result type
    const resultType = results[0]?.type;
    const betterWord = resultType === 'size' ? 'less' : 'faster';
    const worseWord = resultType === 'size' ? 'more' : 'slower';

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
          const bestValue = best[field] as number;
          if (index === 0) {
            entry[field] = 'baseline';
          } else {
            // Handle edge cases where either value is 0
            // When zeros are involved, factor comparisons don't make sense
            if (bestValue === 0 && value === 0) {
              entry[field] = '≈';
              continue;
            }
            if (bestValue === 0 || value === 0) {
              // Just show the actual value when zeros are involved
              entry[field] = formatValue(value, resultType) || '0';
              continue;
            }

            const isBetter = value < bestValue;
            const factor = isBetter ? bestValue / value : value / bestValue;

            if (factor < 1.05) {
              entry[field] = '≈';
              continue;
            } else {
              entry[field] =
                `${factor.toFixed(2)}x ${isBetter ? betterWord : worseWord}`;
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
