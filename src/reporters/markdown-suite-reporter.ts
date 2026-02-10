import { writeFileSync } from 'fs';
import { SuiteReporter } from '../api-types';
import { h1, h2, h3, lines, table } from 'markdown-factory';
import { Result } from '../results';
import { formatValue } from '../utils/format';

interface ComparisonEntry {
  label: string;
  indicator: string;
  [key: string]: string;
}

export class MarkdownSuiteReporter implements SuiteReporter {
  outputFile: string;
  title: string;
  fields: Array<keyof Omit<Result, 'subresults' | 'label' | 'raw'>>;

  constructor(opts: {
    outputFile: string;
    title?: string;
    fields?: MarkdownSuiteReporter['fields'];
  }) {
    this.outputFile = opts.outputFile;
    this.title = opts.title ?? 'Benchmark Results';
    this.fields = opts.fields ?? ['min', 'average', 'p95', 'max'];
  }

  report: (results: Record<string, Result[]>) => void = (results) => {
    const benchmarkSections = Object.entries(results).map(
      ([benchmarkName, benchmarkResults]) => {
        return this.renderBenchmarkSection(benchmarkName, benchmarkResults);
      },
    );

    writeFileSync(this.outputFile, h1(this.title, lines(benchmarkSections)));
  };

  private renderBenchmarkSection(
    benchmarkName: string,
    results: Result[],
  ): string {
    const hasSubresults = results.some((r) => !!r.subresults);
    const hasMultipleVariations = results.length > 1;

    const sections: string[] = [];

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

    // Main results table
    if (hasSubresults) {
      sections.push(
        lines(
          results.map((r) => {
            const entries: Result[] = [{ ...r, label: 'total' }];
            delete entries[0].subresults;
            for (const subresult of r.subresults ?? []) {
              entries.push(subresult);
            }
            return h2(r.label, table(entries, fieldConfigs));
          }),
        ),
      );
    } else {
      sections.push(table(results, fieldConfigs));
    }

    // Comparison section (if multiple variations)
    if (hasMultipleVariations) {
      sections.push(this.generateComparison(results));
    }

    return h2(benchmarkName, lines(sections));
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
}
