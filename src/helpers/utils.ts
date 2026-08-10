import { logger } from "./taskLogger.js";
import type { NodeEnv, PlainObject } from "../types/utils.js";

export const nodeEnvironments: NodeEnv[] = [
  "development",
  "production",
  "test",
];

/**
 * Check if a string is a valid `NodeEnv`
 */
export function isNodeEnv(env?: string | null | undefined): env is NodeEnv {
  return nodeEnvironments.includes(env as NodeEnv);
}

/**
 * Parse a string into a `NodeEnv` node environment
 */
export function parseNodeEnv(env?: string | null | undefined): NodeEnv {
  if (isNodeEnv(env)) {
    return env;
  } else {
    return "production";
  }
}

/**
 * Checks if an object is a plain object.
 * @returns `true` if `val` is a plain object, `false` otherwise.
 */
export function isPlainObject(val: unknown): val is PlainObject {
  return (
    typeof val === "object" &&
    val !== null &&
    Object.getPrototypeOf(val) === Object.prototype
  );
}

/**
 * Return the first valid key's value
 */
function firstValidKeyValue<TObj extends object, TKey extends string>(
  obj: TObj,
  keys: TKey[],
): TObj[keyof TObj] | undefined {
  for (const key of keys) {
    if (key && key in obj) {
      const value = obj[key as unknown as keyof TObj];
      if (value) return value;
    }
  }
  return undefined;
}

/**
 * Get any valid error code (lower case), or undefined
 * - checks properties: `code`, `error`
 */
export function getErrorCode(error: unknown): string | undefined {
  const code = firstValidKeyValue(error ?? {}, ["code", "error"]);
  return `${code}`.toLowerCase() || undefined;
}

/**
 * Get any valid error message, or undefined
 * - checks properties: `message`, `error_description`, `statusText`
 */
export function getErrorMessage(error: unknown): string | undefined {
  const message = firstValidKeyValue(error ?? {}, [
    "message",
    "error_description",
    "statusText",
  ]);
  return `${message}` || undefined;
}

/**
 * Converts any error to a string.
 */
export function errorToString(error: unknown): string {
  if (
    error === null ||
    error === undefined ||
    (typeof error === "string" && !error)
  ) {
    return "Unknown error";
  } else if (typeof error === "object") {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);

    return [code, message].filter(Boolean).join(": ");
  } else {
    return `${error}`;
  }
}

/**
 * Capitalize the first letter of all words.
 */
export function capitalize(str: string): string {
  return str.replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Append an `s` character to `str` if `count` is exactly 1.
 */
export function pluralize(str: string, count: number): string {
  return count === 1 ? str : `${str}s`;
}
