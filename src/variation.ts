import {
  SetupMethod,
  TeardownMethod,
  ActionMethod,
  EnvironmentVariableOptions,
} from './api-types';

export class Variation {
  public setupMethods: SetupMethod[] = [];
  public teardownMethods: TeardownMethod[] = [];

  public environment: Partial<NodeJS.ProcessEnv> = {};

  public action?: ActionMethod;

  constructor(public name: string) {}

  public static FromEnvironmentVariables(
    variables: EnvironmentVariableOptions,
  ): Variation[] {
    const combinations = variables.reduce(
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

  withAction(action: ActionMethod): this {
    this.action = action;
    return this;
  }
}
