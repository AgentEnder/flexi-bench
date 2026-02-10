import { ResultType } from '../results';

/**
 * Format a time value in milliseconds to a human-readable string.
 * Automatically selects the appropriate unit (ms, s, m, h).
 */
export function formatTime(ms: number | undefined): string {
  if (ms === undefined) return '';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const remainingAfterHours = ms % (1000 * 60 * 60);

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

/**
 * Format a size value in bytes to a human-readable string.
 * Automatically selects the appropriate unit (B, KB, MB, GB).
 */
export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '';

  const absBytes = Math.abs(bytes);
  const sign = bytes < 0 ? '-' : '';

  if (absBytes < 1024) {
    return `${sign}${absBytes.toFixed(0)} B`;
  }
  if (absBytes < 1024 * 1024) {
    return `${sign}${(absBytes / 1024).toFixed(2)} KB`;
  }
  if (absBytes < 1024 * 1024 * 1024) {
    return `${sign}${(absBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${sign}${(absBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format a raw number value.
 */
export function formatRaw(value: number | undefined): string {
  if (value === undefined) return '';
  return value.toFixed(2);
}

/**
 * Format a value based on its result type.
 * - 'time': Format as duration (ms, s, m, h)
 * - 'size': Format as bytes (B, KB, MB, GB)
 * - undefined: Format as raw number
 */
export function formatValue(
  value: number | undefined,
  type: ResultType | undefined,
): string {
  if (value === undefined) return '';

  switch (type) {
    case 'time':
      return formatTime(value);
    case 'size':
      return formatSize(value);
    default:
      return formatRaw(value);
  }
}
