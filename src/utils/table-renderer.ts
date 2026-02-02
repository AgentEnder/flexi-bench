import { table } from 'markdown-factory';
import { Result } from '../results';
import { ANSI, getTerminalWidth } from './terminal';

export interface Column {
  field: keyof Result;
  label: string;
  width?: number;
}

const ALL_COLUMNS: Column[] = [
  { field: 'label', label: 'Variation' },
  { field: 'min', label: 'Min', width: 10 },
  { field: 'average', label: 'Avg', width: 10 },
  { field: 'max', label: 'Max', width: 10 },
  { field: 'p95', label: 'P95', width: 10 },
  { field: 'iterations', label: 'Iter', width: 8 },
];

function hasVaryingIterations(results: Result[]): boolean {
  if (results.length === 0) {
    return false;
  }
  const firstIterations = results[0].iterations;
  return results.some((r) => r.iterations !== firstIterations);
}

function getColumnsForWidth(width: number, results: Result[]): Column[] {
  const minWidth = 20;
  const availableWidth = width - minWidth;
  const iterationsVary = hasVaryingIterations(results);

  let columns: Column[] = [{ field: 'label', label: 'Variation' }];
  let usedWidth = 0;

  for (const col of ALL_COLUMNS.slice(1)) {
    const colWidth = col.width ?? 10;
    const padding = 2;

    if (col.field === 'iterations' && !iterationsVary) {
      continue;
    }

    if (usedWidth + colWidth + padding <= availableWidth) {
      columns.push(col);
      usedWidth += colWidth + padding;
    } else {
      break;
    }
  }

  return columns;
}

export function canFitTable(minWidth: number = 80): boolean {
  return getTerminalWidth() >= minWidth;
}

export function renderResults(
  benchmarkName: string,
  results: Result[],
  noColor: boolean,
): void {
  const width = getTerminalWidth();
  const iterationsVary = hasVaryingIterations(results);

  let header = noColor
    ? `Benchmark: ${benchmarkName}`
    : `${ANSI.BOLD}Benchmark: ${benchmarkName}${ANSI.RESET}`;

  if (!iterationsVary && results[0]?.iterations !== undefined) {
    header += ` (${results[0].iterations} iterations)`;
  }

  console.log('');
  console.log(header);
  console.log('');

  const columns = getColumnsForWidth(width, results);
  const tableString = renderTableString(results, columns, noColor);
  console.log(tableString);
}

function renderTableString(
  results: Result[],
  columns: Column[],
  noColor: boolean,
): string {
  const fieldConfigs = columns.map((col) => ({
    field: col.field,
    label: col.label,
    mapFn: (item: Result) => {
      const value = item[col.field];
      if (col.field === 'label') {
        return String(value);
      }
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return String(value ?? '');
    },
  }));

  return table(results, fieldConfigs);
}
