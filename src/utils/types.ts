/**
 * A lazy promise that defers execution until `.then()`, `.catch()`, or `.finally()` is called.
 *
 * Unlike a standard Promise which begins execution immediately upon construction,
 * a Lazy promise only starts its executor when the result is actually consumed.
 * This is useful for deferring expensive operations until they're needed.
 */
export class Lazy<T> implements Promise<T> {
  private promise: Promise<unknown> | null = null;
  private registerPromiseChain: (
    promise: Promise<unknown>,
  ) => Promise<unknown> = (p) => p;

  constructor(
    private executor:
      | ((res: (val: T) => void, rej: (reason?: any) => void) => void)
      | (() => Promise<T>),
  ) {}

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    if (!this.promise) {
      this.promise = this.registerPromiseChain(
        new Promise<T>((res, rej) => {
          const result = this.executor(res, rej);
          if (result instanceof Promise) {
            result.then(res).catch(rej);
          }
        }),
      );
    }
    return (this.promise as Promise<T>).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined,
  ): Promise<T | TResult> {
    this.registerPromiseChain = (promise) => promise?.catch(onrejected);
    return this;
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    this.registerPromiseChain = (promise) => promise?.finally(onfinally);
    return this;
  }

  [Symbol.toStringTag] = 'Lazy [Promise]';
}

/**
 * A Map with two disjoint key-value pair types.
 *
 * This provides type-safe overloads for `get` and `set` so that
 * each key type is associated with its corresponding value type,
 * rather than collapsing to a union.
 *
 * @typeParam KT - First key type
 * @typeParam VT - First value type
 * @typeParam KT2 - Second key type
 * @typeParam VT2 - Second value type
 */
export class DisjointMap<KT, VT, KT2, VT2> extends Map<
  KT | KT2,
  VT | VT2
> {
  set(key: KT, value: VT): this;
  set(key: KT2, value: VT2): this;
  set(key: KT | KT2, value: VT | VT2): this {
    return super.set(key, value);
  }

  get(key: KT): VT | undefined;
  get(key: KT2): VT2 | undefined;
  get(key: KT | KT2): VT | VT2 | undefined {
    return super.get(key);
  }

  entries(): IterableIterator<[KT | KT2, VT | VT2]> {
    return super.entries();
  }
}
