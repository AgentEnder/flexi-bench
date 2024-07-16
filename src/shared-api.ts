import { Action, SetupMethod, TeardownMethod } from './api-types';

export class BenchmarkBase {
  public setupEachMethods: SetupMethod[] = [];
  public setupMethods: SetupMethod[] = [];
  public teardownMethods: TeardownMethod[] = [];
  public teardownEachMethods: TeardownMethod[] = [];
  public action?: Action;

  withSetup(setup: SetupMethod): this {
    this.setupMethods.push(setup);
    return this;
  }

  withSetupEach(setup: SetupMethod): this {
    this.setupEachMethods.push(setup);
    return this;
  }

  withTeardown(teardown: TeardownMethod): this {
    this.teardownMethods.push(teardown);
    return this;
  }

  withTeardownEach(teardown: TeardownMethod): this {
    this.teardownEachMethods.push(teardown);
    return this;
  }

  withAction(action: Action): this {
    this.action = action;
    return this;
  }
}
