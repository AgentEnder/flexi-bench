import type { CLI } from 'cli-forge';
import { disableCollectOnlyMode } from '../collect-mode';
import { filterSupportedFiles, loadBenchmarkFile } from './load-file';
import { CommandSummary, printSummary } from './summary';

export function registerRunCommand(cli: CLI) {
  return cli.command('run', {
    description: 'Run benchmarks from one or more files',
    builder: (args) =>
      args
        .positional('files', {
          type: 'array',
          items: 'string',
          description: 'Paths to benchmark files',
          required: true,
        })
        .option('filter', {
          type: 'string',
          description: 'Regex pattern to filter suite/benchmark names',
        }),
    handler: async (args) => {
      const { files, warnings } = filterSupportedFiles(args.files);
      const filter = args.filter ? new RegExp(args.filter) : undefined;
      let anyMatched = false;

      const summary: CommandSummary = {
        filesProcessed: files.length,
        benchmarksFound: 0,
        benchmarksRun: 0,
        benchmarksSucceeded: 0,
        benchmarksFailed: 0,
        warnings: [...warnings],
      };

      for (const file of files) {
        const result = await loadBenchmarkFile(file);
        summary.warnings.push(...result.warnings);

        // Re-enable .run() for execution
        disableCollectOnlyMode();

        // Count discovered benchmarks
        for (const entry of result.entries) {
          if (entry.type === 'suite') {
            summary.benchmarksFound += entry.instance.getBenchmarks().length;
          } else {
            summary.benchmarksFound++;
          }
        }

        for (const entry of result.entries) {
          if (entry.type === 'suite') {
            const suite = entry.instance;
            if (!filter || filter.test(suite.name)) {
              const benchmarkCount = suite.getBenchmarks().length;
              try {
                await suite.run();
                summary.benchmarksRun += benchmarkCount;
                summary.benchmarksSucceeded += benchmarkCount;
              } catch (err) {
                summary.benchmarksRun += benchmarkCount;
                summary.benchmarksFailed += benchmarkCount;
              }
              anyMatched = true;
            } else {
              const matching = suite
                .getBenchmarks()
                .filter((b) => filter.test(b.name));
              for (const b of matching) {
                summary.benchmarksRun++;
                try {
                  await b.run();
                  summary.benchmarksSucceeded++;
                } catch {
                  summary.benchmarksFailed++;
                }
                anyMatched = true;
              }
            }
          } else {
            if (!filter || filter.test(entry.instance.name)) {
              summary.benchmarksRun++;
              try {
                await entry.instance.run();
                summary.benchmarksSucceeded++;
              } catch {
                summary.benchmarksFailed++;
              }
              anyMatched = true;
            }
          }
        }
      }

      if (filter && !anyMatched) {
        summary.warnings.push('No benchmarks matched the filter.');
      }

      printSummary(summary);
    },
  });
}
