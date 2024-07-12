import {
  SetupMethod,
  TeardownMethod,
  EnvironmentVariableOptions,
  Action,
} from './api-types';
import { findCombinations } from './utils';

export class Variation {
  public setupMethods: SetupMethod[] = [];
  public teardownMethods: TeardownMethod[] = [];

  public environment: Partial<NodeJS.ProcessEnv> = {};
  public cliArgs: string[] = [];

  public action?: Action;

  constructor(public name: string) {}

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

  withSetup(setup: SetupMethod): this {
    this.setupMethods.push(setup);
    return this;
  }

  withTeardown(teardown: TeardownMethod): this {
    this.teardownMethods.push(teardown);
    return this;
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

  withAction(action: Action): this {
    this.action = action;
    return this;
  }

  withCliArgs(...args: string[]): this {
    this.cliArgs = this.cliArgs.concat(args);
    return this;
  }
}
