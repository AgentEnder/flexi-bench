const measures: Record<string, number[]> = {};

export type PerformanceObserverOptions = {
  measureFilter?: (entry: PerformanceEntry) => boolean;
  label?: Record<string, string> | ((label: string) => string);
};

export function registerPerformanceObserver(opts?: PerformanceObserverOptions) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (
        entry.entryType === 'measure' &&
        (!opts?.measureFilter || opts?.measureFilter?.(entry))
      ) {
        const label = normalizeLabel(entry.name, opts?.label);
        measures[label] ??= [];
        measures[label].push(entry.duration);
      }
    }
  });

  observer.observe({ entryTypes: ['measure'] });
}

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

export function getMeasures() {
  return measures;
}

export function clearMeasures() {
  for (const key in measures) {
    delete measures[key];
  }
}
