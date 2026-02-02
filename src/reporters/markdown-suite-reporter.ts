import { writeFileSync } from 'fs';
import { SuiteReporter } from '../api-types';
import { h1, h2, h3, lines, table } from 'markdown-factory';
import { Result } from '../results';

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
            return this.formatDuration(value);
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
            const factor = value / fastestValue;
            entry[field] = `${factor.toFixed(2)}x slower`;
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
