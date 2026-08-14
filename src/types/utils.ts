declare const brand: unique symbol;

export type Brand<T, Name extends string> = T & {
  readonly [brand]: Name;
};

export type NodeEnv = "development" | "production" | "test";

/**
 * Pick `K` properties in `T`, but also accept any other `string` properties.
 */
export type PickLoose<T, K extends keyof T> = Pick<T, K> &
  Record<string, unknown>;

/**
 * Make `K` properties ìn `T` required.
 */
export type PickRequired<T, K extends keyof T> = Pick<T, K> &
  Partial<Omit<T, K>>;

/**
 * Omit `K` properties in `T`, but also accept any other `string` properties.
 */
export type OmitLoose<T, K extends keyof T> = Omit<T, K> &
  Record<string, unknown>;

/**
 * Make `K` properties in `T` partial.
 */
export type OmitPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Shorthand for `Record<string, string>`
 */
export type StringObject = Record<string, string>;

/**
 * Shorthand for `Record<string, unknown>`
 */
export type StringKeyObject = Record<string, unknown>;

/**
 * A type representing a plain JavaScript object.
 */
export type PlainObject = Record<string | number | symbol, unknown>;

/**
 * Check if `T` is a plain JavaScript object.
 */
export type IsPlainObject<T> = T extends PlainObject ? true : false;

type KeysOfUnion<T> = T extends PlainObject ? keyof T : never;

export type DisjointUnion<
  T,
  AllKeys extends string = KeysOfUnion<T> & string,
> = T extends PlainObject
  ? T & { [K in Exclude<AllKeys, keyof T>]?: undefined }
  : T;
