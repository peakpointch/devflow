import picomatch from "picomatch";

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

export function groupRegExp(
  patterns: RegExp | RegExpArray,
  opts: {
    name?: string;
    optional?: boolean;
    flags?: string;
    nonCapturing?: boolean;
  } = {},
): RegExp {
  const pattern = Array.isArray(patterns) ? joinRegExp(patterns) : patterns;
  const groupStart = opts.nonCapturing
    ? "(?:"
    : opts.name
      ? `(?<${opts.name}>`
      : "(";
  const groupEnd = opts.optional ? ")?" : ")";
  const flags = opts.flags ?? pattern.flags;
  return new RegExp(groupStart + pattern.source + groupEnd, flags);
}

export function optionalRegExp(
  patterns: RegExp | RegExpArray,
  flags?: string,
): RegExp {
  const pattern = Array.isArray(patterns) ? joinRegExp(patterns) : patterns;
  const groupStart = "(?:";
  const groupEnd = ")?";
  return new RegExp(
    groupStart + pattern.source + groupEnd,
    flags ?? pattern.flags,
  );
}

export function unionRegExp(patterns: RegExpArray, flags?: string): RegExp {
  const combinedPattern = patterns
    .map((part) => {
      const partStr =
        typeof part === "string" ? escapeRegExp(part) : part.source;
      return partStr ? `(?:${partStr})` : "";
    })
    .filter(Boolean)
    .join("|");

  return new RegExp(combinedPattern, flags);
}

// TODO: implement something like this in joinRegExp or just in general
// inside htmlRewriter.ts. See docs/html-rewriter-limitations.md
// function flagsOf(...regexes: (RegExp | undefined)[]): string {
//   const flags = new Set<string>();
//   for (const r of regexes) {
//     if (r) for (const f of r.flags) flags.add(f);
//   }
//   return Array.from(flags).join("");
// }

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
 * Converts a glob pattern to a regex.
 *
 * Supports standard glob patterns, globstars, extglobs,
 * braces, character classes, and pattern negation.
 */
export function globToRegExp(pattern: string): RegExp {
  return picomatch.makeRe(pattern, {
    dot: true,
  });
}
