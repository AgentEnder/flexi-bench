import type { CLI } from 'cli-forge';
import {
  BenchmarkTreeNode,
  filterSupportedFiles,
  loadBenchmarkFile,
} from './load-file';
import { printListSummary } from './summary';

export function registerListCommand(cli: CLI) {
  return cli.command('list', {
    description: 'List benchmarks and suites in one or more files',
    builder: (args) =>
      args
        .positional('files', {
          type: 'array',
          items: 'string',
          description: 'Paths to benchmark files',
          required: true,
        })
        .option('json', {
          type: 'boolean',
          description: 'Output as JSON',
          default: false,
        }),
    handler: async (args) => {
      const { files, warnings } = filterSupportedFiles(args.files);
      const allWarnings: string[] = [...warnings];
      const tree: BenchmarkTreeNode[] = [];

      for (const file of files) {
        const result = await loadBenchmarkFile(file);
        allWarnings.push(...result.warnings);
        for (const entry of result.entries) {
          if (entry.type === 'suite') {
            tree.push({
              type: 'suite',
              name: entry.instance.name,
              children: entry.instance.getBenchmarks().map((b) => ({
                type: 'benchmark' as const,
                name: b.name,
              })),
            });
          } else {
            tree.push({ type: 'benchmark', name: entry.instance.name });
          }
        }
      }

      if (args.json) {
        console.log(JSON.stringify(tree, null, 2));
      } else if (process.stdout.isTTY) {
        printTree(tree);
      } else {
        printFlatNames(tree);
      }

      if (process.stdout.isTTY || args.json) {
        const benchmarksFound = countBenchmarks(tree);
        printListSummary({
          filesProcessed: files.length,
          benchmarksFound,
          warnings: allWarnings,
        });
      }
    },
  });
}

function countBenchmarks(tree: BenchmarkTreeNode[]): number {
  let count = 0;
  for (const node of tree) {
    if (node.type === 'suite') {
      count += node.children.length;
    } else {
      count++;
    }
  }
  return count;
}

function printTree(tree: BenchmarkTreeNode[]): void {
  for (const node of tree) {
    if (node.type === 'suite') {
      console.log(`Suite: ${node.name}`);
      for (const child of node.children) {
        console.log(`  Benchmark: ${child.name}`);
      }
    } else {
      console.log(`Benchmark: ${node.name}`);
    }
  }
}

function printFlatNames(tree: BenchmarkTreeNode[]): void {
  for (const node of tree) {
    if (node.type === 'suite') {
      for (const child of node.children) {
        console.log(`${node.name} > ${child.name}`);
      }
    } else {
      console.log(node.name);
    }
  }
}
