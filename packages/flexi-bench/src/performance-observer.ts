import { PerformanceEntry, PerformanceObserver } from 'node:perf_hooks';

export class PerformanceWatcher {
  private observer?: PerformanceObserver;
  private measures: Record<string, number[]> = {};

  constructor(opts: PerformanceObserverOptions = {}) {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          entry.entryType === 'measure' &&
          (!opts.measureFilter || opts.measureFilter(entry))
        ) {
          const label = normalizeLabel(entry.name, opts?.label);
          this.measures[label] ??= [];
          this.measures[label].push(entry.duration);
        }
      }
    });

    this.observer.observe({ entryTypes: ['measure'] });
  }

  // This method is async to give the observer time to collect the measures...
  // If the action being ran by the benchmark is synchronous, the observer will
  // not fire until the next tick so we need that to happen before the measures are
  // retrieved. Since this method is async, it must be awaited, which actually gives
  // the observer time to collect the measures.
  async getMeasures() {
    return this.measures;
  }

  clearMeasures() {
    for (const key in this.measures) {
      delete this.measures[key];
    }
  }

  disconnect() {
    this.observer?.disconnect();
    delete this.observer;
  }
}

export type PerformanceObserverOptions = {
  measureFilter?: (entry: PerformanceEntry) => boolean;
  label?: Record<string, string> | ((label: string) => string);
};

function normalizeLabel(
  label: string,
  transform?: PerformanceObserverOptions['label'],
) {
  if (transform) {
    return typeof transform === 'function'
      ? transform(label)
      : transform[label];
  }
  return label;
}
