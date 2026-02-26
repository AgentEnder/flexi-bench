import { useState, useEffect } from 'react';
import {
  loadBenchmarkFile,
  filterSupportedFiles,
} from 'flexi-bench';
import type { DiscoveredEntry } from 'flexi-bench';

export type BenchmarkItem = {
  id: string;
  label: string;
  entry: DiscoveredEntry;
  file: string;
  parentSuite?: string;
};

export type UseBenchmarksResult = {
  items: BenchmarkItem[];
  loading: boolean;
  error: string | null;
  warnings: string[];
};

export function useBenchmarks(files: string[]): UseBenchmarksResult {
  const [items, setItems] = useState<BenchmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function discover() {
      try {
        const { files: supported, warnings: filterWarnings } =
          filterSupportedFiles(files);
        const allWarnings = [...filterWarnings];
        const allItems: BenchmarkItem[] = [];
        let idCounter = 0;

        for (const file of supported) {
          const result = await loadBenchmarkFile(file);
          allWarnings.push(...result.warnings);

          for (const entry of result.entries) {
            if (entry.type === 'suite') {
              const suiteId = String(idCounter++);
              allItems.push({
                id: suiteId,
                label: `Suite: ${entry.instance.name}`,
                entry,
                file,
              });
              for (const b of entry.instance.getBenchmarks()) {
                allItems.push({
                  id: String(idCounter++),
                  label: `  ${b.name}`,
                  entry: { type: 'benchmark', instance: b },
                  file,
                  parentSuite: entry.instance.name,
                });
              }
            } else {
              allItems.push({
                id: String(idCounter++),
                label: entry.instance.name,
                entry,
                file,
              });
            }
          }
        }

        if (!cancelled) {
          setItems(allItems);
          setWarnings(allWarnings);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load benchmarks',
          );
          setLoading(false);
        }
      }
    }

    discover();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error, warnings };
}
