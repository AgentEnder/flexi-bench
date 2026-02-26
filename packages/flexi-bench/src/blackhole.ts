type SinkState = {
  checksum: number;
  count: number;
};

const SINK_KEY = Symbol.for('flexi-bench.blackhole.sink');
const OBJECT_IDS = new WeakMap<object, number>();
let nextObjectId = 1;

function getSinkState(): SinkState {
  const globalWithSink = globalThis as typeof globalThis & {
    [SINK_KEY]?: SinkState;
  };
  if (!globalWithSink[SINK_KEY]) {
    globalWithSink[SINK_KEY] = { checksum: 0, count: 0 };
  }
  return globalWithSink[SINK_KEY]!;
}

function mix(current: number, value: number): number {
  return ((current * 31) ^ value) >>> 0;
}

function getObjectId(value: object): number {
  const existing = OBJECT_IDS.get(value);
  if (existing !== undefined) {
    return existing;
  }
  const id = nextObjectId++;
  OBJECT_IDS.set(value, id);
  return id;
}

function hashUnknown(value: unknown): number {
  switch (typeof value) {
    case 'undefined':
      return 1;
    case 'boolean':
      return value ? 2 : 3;
    case 'number':
      return Number.isFinite(value) ? ((value * 1000003) | 0) >>> 0 : 4;
    case 'bigint':
      return Number(value & 0xffffffffn);
    case 'string': {
      let h = value.length >>> 0;
      for (let i = 0; i < value.length; i++) {
        h = mix(h, value.charCodeAt(i));
      }
      return h;
    }
    case 'symbol':
      return mix(5, hashUnknown(String(value)));
    case 'function':
      return mix(6, getObjectId(value));
    case 'object':
      return value === null ? 7 : mix(8, getObjectId(value));
    default:
      return 9;
  }
}

/**
 * Consumes a value in an observable way so engines cannot trivially remove
 * benchmarked work as dead code.
 */
export function blackhole(value: unknown): void {
  const sink = getSinkState();
  sink.count++;
  sink.checksum = mix(mix(sink.checksum, sink.count), hashUnknown(value));
}

/**
 * Returns a checksum representing all values consumed by {@link blackhole}
 * in the current process.
 */
export function getBlackholeChecksum(): number {
  return getSinkState().checksum;
}

/**
 * Resets the global sink state.
 * Primarily useful for deterministic tests.
 */
export function resetBlackhole(): void {
  const sink = getSinkState();
  sink.count = 0;
  sink.checksum = 0;
}
