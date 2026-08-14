import fs from "fs";
import os from "os";
import path from "path";
import { mergeOptions } from "peakflow/utils";
import { anchorRegExp, strToRegExp, joinRegExp } from "./regexp.js";
import { errorToString, isPlainObject } from "./utils.js";
import type { OmitPartial } from "../types/utils.js";
import type { PartialDeep } from "type-fest";

/**
 * Allowed quotes for variable values
 */
export type DotenvQuote = "'" | '"' | "`";

/**
 * Allowed quotes for variable values
 */
export type DotenvQuoteName = "single" | "double" | "backtick";

/**
 * A Dotenv variable definition
 */
export type DotenvVariable<
  TName extends string = string,
  TValue extends string = string,
> = {
  /** The name of the variable */
  key: TName;
  /** The value of the variable */
  value: TValue | null | undefined;
  /**
   * The comment value, without the ' # '.
   * @default undefined
   */
  comment?: string | null | undefined;
  /**
   * Export the variable using the "export" keyword.
   * @default false
   */
  xport?: boolean | null | undefined;
};

export type DotenvCaptureGroupName = keyof DotenvVariable;

export type DotenvCaptureGroups = {
  [Key in DotenvCaptureGroupName]?: string | undefined;
};

export type DotenvVariableMapEntry<
  TName extends string = string,
  TValue extends string = string,
> =
  | OmitPartial<DotenvVariable<TName, TValue>, "key" | "value">
  | TValue
  | null
  | undefined;

/**
 * A map of environment variables
 */
export type DotenvVariableMap<TName extends string = string> = Record<
  TName,
  DotenvVariableMapEntry<TName>
>;

export interface DotenvQuoteOptions {
  /**
   * Always wrap values in quotes
   * @default false
   */
  force: boolean;
  /**
   * The type of quotes to use when an unquoted value needs to
   * be quoted.
   * @default "double"
   */
  preferred: DotenvQuoteName | DotenvQuote;
}

export interface DotenvCommentOptions {
  /**
   * Always reformat the comment, otherwise try to preserve the
   * original formatting, if `str` is formatted as a comment.
   * @default false
   */
  forceFormat: boolean;
  /**
   * Use this format when formatting a comment
   * @default " # "
   */
  format: string;
}

export interface DotenvOptions {
  /**
   * Allow updating existing variables
   * @default false
   */
  update: boolean;
  /**
   * Remove duplicates of an existing variables
   * @default true
   */
  deduplicate: boolean;
  quotes: DotenvQuoteOptions;
  comments: DotenvCommentOptions;
}

/**
 * Required options for writing to a `.env` file
 */
export interface DotenvWriteOptions extends DotenvOptions {
  /**
   * Fully resolved path to the `.env` file
   */
  path: string;
}

export const dotenvDefaultOptions: DotenvOptions = {
  update: false,
  deduplicate: true,
  quotes: {
    force: false,
    preferred: "double",
  },
  comments: {
    forceFormat: false,
    format: " # ",
  },
};

const dotenvr = {
  sol: /(?:^|^)/,
  /**
   * @modified Capture group `xport`, replaced `\s` with `[^\S\r\n]`
   * Named `xport` because `export` is a reserved keyword
   */
  xport: /[^\S\r\n]*(?<xport>export[^\S\r\n]+)?/,
  /**
   * @modified Capture group `key`
   */
  key: /(?<key>[\w.-]+)/,
  assign: /(?:\s*=\s*?|:\s+?)/,
  /**
   * @modified Capture group `value`, unquoted value ends on non-space character
   */
  value:
    /(?<value>\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]*[^#\s])?/,
  /**
   * @modified Capture group `comment`, replaced `\s` with `[^\S\r\n]`
   */
  comment: /(?<comment>[^\S\r\n]*#.*)?/,
  eol: /(?:$|$)/,
} as const;

/**
 * Detects end-of-line marker in content, and falls back to:
 * `\n` on POSIX
 * `\r\n` on Windows
 *
 * @param content A string to detect the end-of-line marker from
 * @returns The end-of-line marker
 */
export function getEol(content?: string | null | undefined): string {
  return content?.match(/\r\n|\n|\r/)?.[0] ?? os.EOL;
}

/**
 * @param Optional `RegExp` representing a variable name
 * @param Optional `RegExp` representing a variable value
 * @returns A `RegExp` representing a dotenv line with three capturing groups:
 * - $1 = "xport"   : The export keyword
 * - $2 = "key"     : Name of the variable
 * - $3 = "value"   : Value of the variable (including leading spaces and quotes)
 * - $4 = "comment" : The comment (including ' #')
 */
export function dotenvLineRegExp(key?: RegExp, value?: RegExp) {
  const parts = [
    dotenvr.sol,
    dotenvr.xport,
    key !== undefined ? new RegExp(`(?<key>${key.source})`) : dotenvr.key,
    dotenvr.assign,
    value !== undefined
      ? new RegExp(`(?<value>${value.source})`)
      : dotenvr.value,
    dotenvr.comment,
    dotenvr.eol,
  ];
  return joinRegExp(parts, "gm");
}

/**
 * Maps quote names or chars to a valid dotenv quote character
 * @readonly DO NOT modify or edit this
 */
export const dotenvQuoteMap: Record<
  DotenvQuoteName | DotenvQuote,
  DotenvQuote
> = {
  single: "'",
  double: '"',
  backtick: "`",
  "'": "'",
  '"': '"',
  "`": "`",
} as const;

/**
 * Quote a dotenv value and escape any unescaped quotes
 * @param value The value that should be quoted
 * @param type The type of quote to use
 */
export function dotenvQuote(
  value: string,
  type: DotenvQuoteName | DotenvQuote = "double",
): string {
  const quote = dotenvQuoteMap[type];
  return (
    quote +
    value.replace(new RegExp(`(?<!\\\\)${quote}`, "g"), `\\${quote}`) +
    quote
  );
}

/**
 * Get the resolved path to the `.env` file
 */
export function getDotenvPath(): string {
  return path.resolve(process.cwd(), ".env");
}

/**
 * Formats the `export` keyword based on `xport`
 * @param xport A `boolean` or a `string` that specifies whether to export a variable
 * @returns The `export` keyword string `"export "` or `""`
 */
export function dotenvExport(
  xport: boolean | string | null | undefined,
): string {
  return Boolean(typeof xport === "string" ? xport.startsWith("export") : xport)
    ? `export `
    : "";
}

/**
 * Formats a dotenv variable `value`
 * - Quotes the value, if necessary
 * @param value The value to quot
 * @param options
 */
export function dotenvValue(
  value: string,
  options?: PartialDeep<DotenvQuoteOptions>,
): string {
  const opts: DotenvQuoteOptions = {
    force: options?.force ?? false,
    preferred: options?.preferred || "double",
  };
  if (
    !opts.force &&
    anchorRegExp(dotenvr.value).test(value) &&
    !/^\s/.test(value)
  ) {
    return value;
  } else {
    return dotenvQuote(value, opts.preferred);
  }
}

/**
 * Formats a dotenv `comment`.
 * @param str A string representing a dotenv comment
 * @param format Always reformat the comment, otherwise try to preserve the
 * original formatting, if `str` is formatted as a comment.
 * Default: `false`
 * @returns The formatted comment
 *
 * @example ```typescript
 * dotenvComment("  #    formatting preserved", true) // "  #    formatting preserved"
 * dotenvComment("  #    reformatted", false) // " # reformatted"
 * dotenvComment("unable to preserve formatting", true) // " # unable to preserve formatting", because `str` was not formatted as a comment
 * dotenvComment("unformatted comment", false) // " # unformatted comment"
 * ```
 */
export function dotenvComment(
  str: string | null | undefined,
  options?: Partial<DotenvCommentOptions>,
): string {
  const opts: DotenvCommentOptions = {
    forceFormat:
      options?.forceFormat ?? dotenvDefaultOptions.comments.forceFormat,
    format: options?.format || dotenvDefaultOptions.comments.format,
  };
  if (!str) return "";
  return !opts.forceFormat && /^[^\S\r\n]*#[^\S\r\n]*/.test(str)
    ? str
    : `${opts.format}${parseDotenvComment(str)}`;
}

/**
 * Parse a dotenv variable name
 * @param key The variable name to parse
 * @returns The parsed variable name
 * @throws `Error` if key is falsy
 */
export function parseDotenvKey(key: string): string {
  if (!key || !anchorRegExp(dotenvr.key).test(key)) {
    throw new Error(`Invalid dotenv variable name: ${key}`);
  }
  return key;
}

/**
 * Parse a dotenv value from the `RegExp` `value` capture group
 * @param value The value to parse
 * @returns The parsed dotenv variable value
 */
export function parseDotenvValue(value: string | null | undefined): string {
  // Default null or undefined to empty string
  value = value || "";

  // Remove whitespace
  value = value.trim();

  // Check if double quoted
  const maybeQuote = value[0];

  // Remove surrounding quotes
  value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

  // Expand newlines if double quoted
  if (maybeQuote === '"') {
    value = value.replace(/\\n/g, "\n");
    value = value.replace(/\\r/g, "\r");
  }

  return value;
}

/**
 * Parse a dotenv comment from the `RegExp` `comment` capture group.
 * This removes all leading or trailing whitespace, along with the `#` char.
 * @param comment The dotenv comment to parse
 * @returns The content of the comment, or undefined if no comment was passed
 * @example ```typescript
 * parseDotenvComment("   # This is a comment") // "This is a comment"
 * ```
 */
export function parseDotenvComment(
  comment: string | null | undefined,
): string | undefined {
  // Default null or undefined to undefined
  if (comment === null || comment === undefined) {
    return undefined;
  }

  // Remove whitespace
  comment = comment.trim();

  // Remove leading `#` and following spaces
  comment = comment.replace(/^#[^\S\r\n]*/, "");

  return comment;
}

/**
 * Parse the `RegExp` capture groups of a matched dotenv line
 * @returns An object with the parsed capture groups
 * @see `parseDotenvKey`, `parseDotenvValue`, `parseDotenvComment` for more details
 */
export function parseDotenvGroups({
  xport,
  key,
  value,
  comment,
}: DotenvCaptureGroups): DotenvCaptureGroups {
  return {
    xport,
    key: parseDotenvKey(key as string),
    value: parseDotenvValue(value),
    comment: parseDotenvComment(comment),
  };
}

/**
 * Sanitize a dotenv variable map entry
 * @param key The current name of the variable
 * @param variable The variable to sanitize
 * @throws `Error` if the variable name is invalid
 */
export function sanitizeDotenvVariable(
  key: string,
  variable: DotenvVariableMapEntry,
): DotenvVariable {
  if (typeof variable === "string") {
    return {
      key: parseDotenvKey(key),
      value: variable,
    };
  } else if (isPlainObject(variable)) {
    return {
      key: parseDotenvKey(variable.key ?? key),
      value: variable.value,
      comment: variable.comment,
      xport: variable.xport,
    };
  } else {
    return {
      key: parseDotenvKey(key),
      value: undefined,
    };
  }
}

/**
 * Edits the dotenv file content with the new variables
 * @param content The existing content
 * @param variables A map of environment variables to store in the `.env` file
 * @param options Control how to set environment variables
 * @returns An object with the updated content and a list of errors
 */
export function editDotenvContent(
  content: string,
  variables: DotenvVariableMap,
  options?: PartialDeep<DotenvOptions>,
): { content: string; errors: string[] } {
  const errors = [];
  const eol = getEol(content);
  const opts = mergeOptions(dotenvDefaultOptions, options ?? {});

  /*
   *  NOTE: Always use `envVar.key` as the new key
   *  - `key` is the "old" key, if the variable is being renamed
   *  - `envVar.key` can always be considered as the new key
   */
  for (const key in variables) {
    let envVar: DotenvVariable;
    let count = 0;

    try {
      envVar = sanitizeDotenvVariable(key, variables[key]);
    } catch (err) {
      errors.push(errorToString(err));
      continue;
    }

    const isRename = key !== envVar.key;

    function updateVar(key: string) {
      const linePattern = dotenvLineRegExp(strToRegExp(key));
      content = content.replace(linePattern, (match, ...args) => {
        count++;

        if (!opts.update) {
          throw new Error(
            `Variable "${key}" already exists. Resolve the conflict manually or enable \`options.update\`.`,
          );
        }

        if (count > 1) {
          if (count === 2) {
            errors.push(
              `Multiple definitions of variable: "${key}"${
                opts.deduplicate ? ". Deleting duplicates..." : ""
              }`,
            );
          }
          return opts.deduplicate ? "" : match;
        }

        const groups = args[args.length - 1] as DotenvCaptureGroups;
        const { value, xport, comment } = groups;
        const line = `${dotenvExport(envVar.xport ?? xport)}${envVar.key}=${dotenvValue(
          envVar.value ?? value ?? "",
          opts.quotes,
        )}${dotenvComment(envVar.comment ?? comment, opts.comments)}`;

        return line;
      });
    }

    try {
      updateVar(key);

      // Try again with the new key, if we are renaming
      if (isRename && count === 0) {
        updateVar(envVar.key);
      }
    } catch (err) {
      errors.push(errorToString(err));
    }

    if (count === 0) {
      if (envVar.value === null || envVar.value === undefined) {
        errors.push(
          `Skipped new variable "${envVar.key}" with undefined value. Use "" as a value if you want to add an empty variable.`,
        );
        continue;
      }
      const line = `${dotenvExport(envVar.xport)}${envVar.key}=${dotenvValue(
        envVar.value,
        opts.quotes,
      )}${dotenvComment(envVar.comment, opts.comments)}`;
      content = `${content.trim()}${eol}${line}${eol}`;
    }
  }

  content = content.trim();

  return { content, errors };
}

/**
 * Write a set of environment variables to the `.env` file
 * @param path The fully resolved path to the `.env` file
 * @param variables A map of environment variables to store in the `.env` file
 * @param options Requires the `path` to the `.env` file
 */
export function editDotenvFile(
  path: string,
  variables: DotenvVariableMap,
  options?: PartialDeep<DotenvOptions>,
): { success: boolean; errors: string[] } {
  let content: string;

  try {
    content = fs.readFileSync(path, { encoding: "utf8" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    } else {
      content = "";
    }
  }

  const { content: updatedContent, errors } = editDotenvContent(
    content,
    variables,
    options,
  );

  fs.writeFileSync(path, updatedContent, "utf8");

  const success = errors.length === 0;

  return { success, errors };
}
