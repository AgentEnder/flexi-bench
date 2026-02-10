import { describe, expect, it } from 'vitest';
import { formatTime, formatSize, formatRaw, formatValue } from './format';

describe('formatTime', () => {
  it('should format milliseconds', () => {
    expect(formatTime(120.5)).toBe('120.5ms');
    expect(formatTime(0.5)).toBe('0.5ms');
  });

  it('should format seconds', () => {
    expect(formatTime(1500)).toBe('1.5s');
    expect(formatTime(59999)).toBe('60.0s');
  });

  it('should format minutes and seconds', () => {
    expect(formatTime(60000)).toBe('1m');
    expect(formatTime(90000)).toBe('1m 30.0s');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatTime(3600000)).toBe('1h');
    expect(formatTime(3661000)).toBe('1h 1m 1.0s');
  });

  it('should return empty string for undefined', () => {
    expect(formatTime(undefined as unknown as number)).toBe('');
  });
});

describe('formatSize', () => {
  it('should format bytes', () => {
    expect(formatSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatSize(1024)).toBe('1.00 KB');
    expect(formatSize(1536)).toBe('1.50 KB');
  });

  it('should format megabytes', () => {
    expect(formatSize(1048576)).toBe('1.00 MB');
    expect(formatSize(90595532.8)).toBe('86.40 MB');
  });

  it('should format gigabytes', () => {
    expect(formatSize(1073741824)).toBe('1.00 GB');
    expect(formatSize(1288490188.8)).toBe('1.20 GB');
  });

  it('should handle negative values', () => {
    expect(formatSize(-1024)).toBe('-1.00 KB');
  });

  it('should return empty string for undefined', () => {
    expect(formatSize(undefined as unknown as number)).toBe('');
  });
});

describe('formatRaw', () => {
  it('should format numbers with 2 decimal places', () => {
    expect(formatRaw(42)).toBe('42.00');
    expect(formatRaw(3.14159)).toBe('3.14');
  });

  it('should return empty string for undefined', () => {
    expect(formatRaw(undefined as unknown as number)).toBe('');
  });
});

describe('formatValue', () => {
  it('should use time formatting for type "time"', () => {
    expect(formatValue(120.5, 'time')).toBe('120.5ms');
  });

  it('should use size formatting for type "size"', () => {
    expect(formatValue(1024, 'size')).toBe('1.00 KB');
  });

  it('should use raw formatting for undefined type', () => {
    expect(formatValue(42, undefined)).toBe('42.00');
  });

  it('should return empty string for undefined value', () => {
    expect(formatValue(undefined as unknown as number, undefined)).toBe('');
  });
});
