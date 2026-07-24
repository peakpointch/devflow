/**
 * Anchors a `RegExp` to the start, end or to the full string
 * @param pattern The `RegExp` to anchor
 * @param type Where to a
 * @returns The anchored `RegExp`
 * @example ```typescript
 * anchorRegExp(/\w+/) // /^\w+$/
 * ```
 */
export function anchorRegExp(
  pattern: RegExp,
  type: "start" | "end" | "full" = "full",
): RegExp {
  const start = ["start", "full"].includes(type) ? "^" : "";
  const end = ["end", "full"].includes(type) ? "$" : "";
  return new RegExp(`${start}${pattern.source}${end}`);
}

/**
 * Escape `RegExp` characters in a string
 * @example ```typescript
 * strToRegExp("foo.*bar") // "foo\.\*bar"
 * ```
 */
export function escapeRegExp(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("Expected a string");
  }
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "\\x2d");
}

/**
 * Convert a literal string into an escaped `RegExp`
 * @param str The string to escape and convert to a `RegExp`
 * @returns The escaped string as a `RegExp`
 * @example ```typescript
 * strToRegExp("foo.*bar") // /foo\.\*bar/
 * ```
 */
export function strToRegExp(str: string): RegExp {
  return new RegExp(escapeRegExp(str));
}

export type RegExpArray = Array<RegExp | string>;

/**
 * Join multiple `RegExp` patterns or strings into a new one
 * @param parts An array of patterns or strings to join
 * @returns A new `RegExp`
 */
export function joinRegExp(parts: RegExpArray, flags?: string): RegExp {
  return new RegExp(
    parts.reduce(
      (pattern, part) =>
        pattern + (part instanceof RegExp ? part.source : part),
      "",
    ),
    flags,
  );
}

/**
 * Converts a glob pattern to a regex
 * - `?` matches a single character, except `/`
 * - `*` matches a single path segment
 * - `**` matches any depth
 * - exact strings match exactly
 */
export function globToRegExp(pattern: string): RegExp {
  // Escape special regex characters except * and /
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex characters
    .replace(/\*\*/g, "<!DOUBLESTAR!>") // Temporarily replace **
    .replace(/\*/g, "[^/]*") // * = single segment
    .replace(/<!DOUBLESTAR!>/g, ".*") // ** = any depth
    .replace(/\?/g, "[^/]"); // ? = single character

  return new RegExp(`^${regexPattern}$`);
}
