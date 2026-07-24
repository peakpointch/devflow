import logger from "./logger.js";
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
    if ("message" in error) return `${error.message}`;
    if ("code" in error) return `${error.code}`;
    if ("status" in error && "statusText" in error)
      return `${error.status} ${error.statusText}`;
    return JSON.stringify(error);
  } else {
    return `${error}`;
  }
}

export function capitalize(str: string): string {
  return str.replace(/\b\w/g, (character) => character.toUpperCase());
}
