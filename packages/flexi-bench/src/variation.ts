import { EnvironmentVariableOptions } from './api-types';
import { BenchmarkBase } from './shared-api';
import { findCombinations } from './utils';

export class Variation extends BenchmarkBase {
  public environment: Partial<NodeJS.ProcessEnv> = {};
  public cliArgs: string[] = [];
  private context: Map<string, unknown> = new Map();

  constructor(public name: string) {
    super();
  }

  /**
   * Sets a value in the variation's context.
   * This allows passing custom data to the action without using environment variables.
   *
   * @example
   * ```typescript
   * new Variation('fast-impl')
   *   .withContext('implementation', fastProcessor)
   *   .withAction((variation) => {
   *     const impl = variation.get<DataProcessor>('implementation');
   *     impl.process(data);
   *   })
   * ```
   */
  withContext<T>(key: string, value: T): this {
    this.context.set(key, value);
    return this;
  }

  /**
   * Gets a value from the variation's context.
   * Returns undefined if the key is not found.
   *
   * @example
   * ```typescript
   * b.withAction((variation) => {
   *   const driver = variation.get<Driver>('driver');
   *   driver.connect();
   * });
   * ```
   */
  get<T>(key: string): T | undefined {
    return this.context.get(key) as T | undefined;
  }

  /**
   * Gets a value from the variation's context with a default value.
   * Returns the default if the key is not found.
   *
   * @example
   * ```typescript
   * const iterations = variation.getOrDefault<number>('iterations', 10);
   * ```
   */
  getOrDefault<T>(key: string, defaultValue: T): T {
    return (this.context.get(key) as T | undefined) ?? defaultValue;
  }

  public static FromEnvironmentVariables(
    variables: EnvironmentVariableOptions,
  ): Variation[] {
    const combinations = findCombinations(
      variables.map(([name, values]) => values.map((value) => [name, value])),
    );

    variables.reduce(
      (acc, [name, values]) => {
        return acc.flatMap((accItem) => {
          return values.map((value) => {
            return [...accItem, [name, value] as const];
          });
        });
      },
      [[]] as Array<Array<readonly [key: string, value: string]>>,
    );
    return combinations.map((combination) => {
      const label = JSON.stringify(combination);
      return new Variation(label).withEnvironmentVariables(
        Object.fromEntries(combination),
      );
    });
  }

  /**
   *
   * @param args An array of options to pass to the CLI. If an element is an array, they will be treated as alternatives.
   * @returns An array of variations. Can be applied with `withVariations`.
   * @example
   * // Creates 2 variations, both with --flag, but one with --no-daemon and the other with --daemon.
   * const variations = Variation.FromCliArgs([
   *  '--flag',
   * ['--no-daemon', '--daemon'],
   * ]);
   *
   * // Creates 4 variations, with combinations of --a and --b.
   * const variations = Variation.FromCliArgs([
   * ['--a', '--b'],
   * ]);
   */
  public static FromCliArgs(args: Array<string | string[]>): Variation[] {
    const alternatives = args.filter(Array.isArray) as string[][];
    const values = findCombinations(alternatives);

    return values.flatMap((alts) => {
      const cliArgs = args.map((arg) =>
        Array.isArray(arg) ? alts.shift()! : arg,
      );
      const label = cliArgs.join(' ');
      return new Variation(label).withCliArgs(...cliArgs);
    });
  }

  /**
   * Creates variations with context values for a single key.
   * Useful for swapping implementations or configurations.
   *
   * @param key The context key to set
   * @param values Array of [name, value] tuples
   * @returns An array of variations with context set
   *
   * @example
   * ```typescript
   * const variations = Variation.FromContext('processor', [
   *   ['loop', loopProcessor],
   *   ['reduce', reduceProcessor],
   * ]);
   *
   * benchmark.withVariations(variations);
   * benchmark.withAction((variation) => {
   *   const processor = variation.get<DataProcessor>('processor');
   *   processor.process(data);
   * });
   * ```
   */
  public static FromContexts<T>(
    key: string,
    values: readonly (readonly [name: string, value: T])[],
  ): Variation[] {
    return values.map(([name, value]) => {
      return new Variation(name).withContext(key, value);
    });
  }

  withEnvironmentVariables(env: Partial<NodeJS.ProcessEnv>): this {
    this.environment = {
      ...this.environment,
      ...env,
    };
    return this;
  }

  withEnvironmentVariable(name: string, value: string): this {
    this.environment[name] = value;
    return this;
  }

  withCliArgs(...args: string[]): this {
    this.cliArgs = this.cliArgs.concat(args);
    return this;
  }
}
