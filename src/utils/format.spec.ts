import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatTime, formatSize, formatValue, formatRaw } from './format';

describe('formatTime', () => {
  it('should format milliseconds', () => {
    assert.strictEqual(formatTime(0), '0.0ms');
    assert.strictEqual(formatTime(100), '100.0ms');
    assert.strictEqual(formatTime(999.5), '999.5ms');
  });

  it('should format seconds', () => {
    assert.strictEqual(formatTime(1000), '1.0s');
    assert.strictEqual(formatTime(1500), '1.5s');
    assert.strictEqual(formatTime(59999), '60.0s');
  });

  it('should format minutes and seconds', () => {
    assert.strictEqual(formatTime(60000), '1m');
    assert.strictEqual(formatTime(90000), '1m 30.0s');
    assert.strictEqual(formatTime(120000), '2m');
  });

  it('should format hours, minutes, and seconds', () => {
    assert.strictEqual(formatTime(3600000), '1h');
    assert.strictEqual(formatTime(3660000), '1h 1m');
    assert.strictEqual(formatTime(3661000), '1h 1m 1.0s');
  });

  it('should return empty string for undefined', () => {
    assert.strictEqual(formatTime(undefined), '');
  });
});

describe('formatSize', () => {
  it('should format bytes', () => {
    assert.strictEqual(formatSize(0), '0 B');
    assert.strictEqual(formatSize(100), '100 B');
    assert.strictEqual(formatSize(1023), '1023 B');
  });

  it('should format kilobytes', () => {
    assert.strictEqual(formatSize(1024), '1.00 KB');
    assert.strictEqual(formatSize(1536), '1.50 KB');
    assert.strictEqual(formatSize(1024 * 1023), '1023.00 KB');
  });

  it('should format megabytes', () => {
    assert.strictEqual(formatSize(1024 * 1024), '1.00 MB');
    assert.strictEqual(formatSize(1024 * 1024 * 86.5), '86.50 MB');
    assert.strictEqual(formatSize(1024 * 1024 * 1023), '1023.00 MB');
  });

  it('should format gigabytes', () => {
    assert.strictEqual(formatSize(1024 * 1024 * 1024), '1.00 GB');
    assert.strictEqual(formatSize(1024 * 1024 * 1024 * 1.5), '1.50 GB');
  });

  it('should handle negative values', () => {
    assert.strictEqual(formatSize(-1024), '-1.00 KB');
    assert.strictEqual(formatSize(-1024 * 1024), '-1.00 MB');
  });

  it('should return empty string for undefined', () => {
    assert.strictEqual(formatSize(undefined), '');
  });
});

describe('formatRaw', () => {
  it('should format numbers with 2 decimal places', () => {
    assert.strictEqual(formatRaw(0), '0.00');
    assert.strictEqual(formatRaw(100), '100.00');
    assert.strictEqual(formatRaw(3.14159), '3.14');
  });

  it('should return empty string for undefined', () => {
    assert.strictEqual(formatRaw(undefined), '');
  });
});

describe('formatValue', () => {
  it('should use time formatting for type "time"', () => {
    assert.strictEqual(formatValue(1500, 'time'), '1.5s');
    assert.strictEqual(formatValue(100, 'time'), '100.0ms');
  });

  it('should use size formatting for type "size"', () => {
    assert.strictEqual(formatValue(1024, 'size'), '1.00 KB');
    assert.strictEqual(formatValue(1024 * 1024, 'size'), '1.00 MB');
  });

  it('should use raw formatting for undefined type', () => {
    assert.strictEqual(formatValue(100, undefined), '100.00');
    assert.strictEqual(formatValue(3.14159, undefined), '3.14');
  });

  it('should return empty string for undefined value', () => {
    assert.strictEqual(formatValue(undefined, 'time'), '');
    assert.strictEqual(formatValue(undefined, 'size'), '');
    assert.strictEqual(formatValue(undefined, undefined), '');
  });
});
