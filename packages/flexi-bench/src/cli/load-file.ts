import * as path from 'path';
import { Benchmark } from '../benchmark';
import { disableAutoRun, drainCollectedLazys } from '../benchmark-runner';
import {
  drainCollectedInstances,
  enableCollectOnlyMode,
} from '../collect-mode';
import { Suite } from '../suite';

/**
 * A node in the benchmark tree, used for listing/inspecting benchmark files.
 */
export type BenchmarkTreeNode =
  | {
      type: 'suite';
      name: string;
      children: { type: 'benchmark'; name: string }[];
    }
  | {
      type: 'benchmark';
      name: string;
    };

/**
 * A discovered entry from loading a benchmark file — can be a Suite or
 * standalone Benchmark from either the DSL or imperative API.
 */
export type DiscoveredEntry =
  | { type: 'suite'; instance: Suite }
  | { type: 'benchmark'; instance: Benchmark };

/**
 * Result of loading a benchmark file, including any warnings generated
 * during collection (e.g. imperative .run() calls in collect-only mode).
 */
export type LoadResult = {
  entries: DiscoveredEntry[];
  warnings: string[];
};

/**
 * Result of filtering file paths to supported extensions.
 */
export type FilterResult = {
  files: string[];
  warnings: string[];
};

const SUPPORTED_EXTENSIONS = ['.ts', '.cts', '.mts', '.js', '.mjs', '.cjs'];

let tsxRegistered = false;

/**
 * Registers tsx if the file is TypeScript, returns the resolved path.
 */
function resolveAndRegister(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (
    !tsxRegistered &&
    (resolved.endsWith('.ts') || resolved.endsWith('.tsx'))
  ) {
    require('tsx/cjs/api').register();
    tsxRegistered = true;
  }
  return resolved;
}

/**
 * Filters file paths to only supported extensions, warning for unsupported ones.
 */
export function filterSupportedFiles(filePaths: string[]): FilterResult {
  const files: string[] = [];
  const warnings: string[] = [];
  for (const file of filePaths) {
    if (SUPPORTED_EXTENSIONS.some((ext) => file.endsWith(ext))) {
      files.push(file);
    } else {
      warnings.push(`Skipping unsupported file ${file}`);
    }
  }
  return { files, warnings };
}

/**
 * Loads a single benchmark file in collect-only mode and returns its
 * discovered suites and standalone benchmarks. No benchmarks are executed.
 *
 * Works with both the DSL API (suite(), benchmark()) and the imperative
 * API (new Suite(...).addBenchmark(...).run()). Imperative .run() calls
 * throw in collect-only mode; unhandled rejections from these are suppressed.
 */
export async function loadBenchmarkFile(
  filePath: string,
): Promise<LoadResult> {
  enableCollectOnlyMode();
  disableAutoRun();

  const warnings: string[] = [];

  // Suppress unhandled rejections from imperative .run() calls
  // that throw in collect-only mode, and surface them as warnings.
  const rejectionHandler = (reason: unknown) => {
    if (
      reason instanceof Error &&
      reason.message.includes('collect-only mode')
    ) {
      warnings.push(
        'File called .run() during collection — this is ignored by the CLI',
      );
      return;
    }
    throw reason;
  };
  process.on('unhandledRejection', rejectionHandler);

  const resolved = resolveAndRegister(filePath);
  require(resolved);

  // Trigger DSL lazys so that suite callbacks execute (registering
  // child benchmarks). The lazys skip .run() in collect-only mode.
  const lazys = drainCollectedLazys();
  await Promise.allSettled(lazys);

  // Wait for microtasks to settle (imperative async IIFEs)
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  process.off('unhandledRejection', rejectionHandler);

  // Drain all instances registered by constructors
  const instances = drainCollectedInstances();

  // Separate suites from standalone benchmarks
  const ownedBenchmarks = new Set<Benchmark>();
  const suites: Suite[] = [];
  const allBenchmarks: Benchmark[] = [];

  for (const inst of instances) {
    if (inst instanceof Suite) {
      suites.push(inst);
      for (const b of inst.getBenchmarks()) {
        ownedBenchmarks.add(b);
      }
    } else if (inst instanceof Benchmark) {
      allBenchmarks.push(inst);
    }
  }

  const results: DiscoveredEntry[] = [];
  for (const suite of suites) {
    results.push({ type: 'suite', instance: suite });
  }
  for (const benchmark of allBenchmarks) {
    if (!ownedBenchmarks.has(benchmark)) {
      results.push({ type: 'benchmark', instance: benchmark });
    }
  }

  return { entries: results, warnings };
}
