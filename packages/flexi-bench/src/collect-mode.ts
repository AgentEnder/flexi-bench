/**
 * Global collect-only mode for CLI inspection.
 *
 * When enabled:
 * - Suite and Benchmark constructors register instances in a shared registry
 * - `.run()` on Suite and Benchmark returns immediately without executing
 * - The `beforeExit` auto-run handler is suppressed
 *
 * This module intentionally avoids importing Suite/Benchmark to prevent
 * circular dependencies. Instances are stored as `unknown` and typed
 * by consumers via instanceof checks.
 */

let collectOnly = false;
const collectedInstances: unknown[] = [];

/**
 * Enables collect-only mode. When active, Suite/Benchmark `.run()` methods
 * return empty results, and all constructed instances are tracked in a registry.
 */
export function enableCollectOnlyMode(): void {
  collectOnly = true;
}

/**
 * Disables collect-only mode, restoring normal `.run()` behavior.
 */
export function disableCollectOnlyMode(): void {
  collectOnly = false;
}

/**
 * Returns whether collect-only mode is currently active.
 */
export function isCollectOnly(): boolean {
  return collectOnly;
}

/**
 * Registers an instance (Suite or Benchmark) in the global registry.
 * Called from constructors. Only collects when collect-only mode is active.
 */
export function registerInstance(instance: unknown): void {
  if (collectOnly) {
    collectedInstances.push(instance);
  }
}

/**
 * Returns and clears all collected instances from the registry.
 */
export function drainCollectedInstances(): unknown[] {
  return collectedInstances.splice(0);
}
