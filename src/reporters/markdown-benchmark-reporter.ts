import { writeFileSync } from 'fs';
import { BenchmarkReporter } from '../api-types';
import { Benchmark } from '../benchmark';
import { h1, h2, lines, table } from 'markdown-factory';
import { Result } from '../results';

export class MarkdownBenchmarkReporter implements BenchmarkReporter {
  outputFile: string;
  fields: Array<keyof Omit<Result, 'subresults' | 'label'>>;

  constructor(opts: {
    outputFile: string;
    fields?: MarkdownBenchmarkReporter['fields'];
  }) {
    this.outputFile = opts.outputFile;
    this.fields = opts.fields ?? ['min', 'average', 'p95', 'max'];
  }

  report: (benchmark: Benchmark, results: Result[]) => void = (
    benchmark,
    results,
  ) => {
    writeFileSync(
      this.outputFile,
      h1(
        benchmark.name,
        results.some((r) => !!r.subresults)
          ? lines(
              results.map((r) => {
                const entries: Result[] = [{ ...r, label: 'total' }];
                delete entries[0].subresults;
                for (const subresult of r.subresults ?? []) {
                  entries.push(subresult);
                }
                return h2(
                  r.label,
                  table(entries, [
                    { field: 'label', label: '' },
                    ...this.fields,
                  ]),
                );
              }),
            )
          : table(results, [{ field: 'label', label: '' }, ...this.fields]),
      ),
    );
  };
}
