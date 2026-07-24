import fs from "fs";
import os from "os";
import path from "path";
import { mergeOptions } from "peakflow/utils";
import { anchorRegExp, strToRegExp, joinRegExp } from "./regexp.js";
import { errorToString, isPlainObject } from "./utils.js";
const dotenvDefaultOptions = {
  update: false,
  deduplicate: true,
  quotes: {
    force: false,
    preferred: "double"
  },
  comments: {
    forceFormat: false,
    format: " # "
  }
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
  value: /(?<value>\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]*[^#\s])?/,
  /**
   * @modified Capture group `comment`, replaced `\s` with `[^\S\r\n]`
   */
  comment: /(?<comment>[^\S\r\n]*#.*)?/,
  eol: /(?:$|$)/
};
function getEol(content) {
  return content?.match(/\r\n|\n|\r/)?.[0] ?? os.EOL;
}
function dotenvLineRegExp(key, value) {
  const parts = [
    dotenvr.sol,
    dotenvr.xport,
    key !== void 0 ? new RegExp(`(?<key>${key.source})`) : dotenvr.key,
    dotenvr.assign,
    value !== void 0 ? new RegExp(`(?<value>${value.source})`) : dotenvr.value,
    dotenvr.comment,
    dotenvr.eol
  ];
  return joinRegExp(parts, "gm");
}
const dotenvQuoteMap = {
  single: "'",
  double: '"',
  backtick: "`",
  "'": "'",
  '"': '"',
  "`": "`"
};
function dotenvQuote(value, type = "double") {
  const quote = dotenvQuoteMap[type];
  return quote + value.replace(new RegExp(`(?<!\\\\)${quote}`, "g"), `\\${quote}`) + quote;
}
function getDotenvPath() {
  return path.resolve(process.cwd(), ".env");
}
function dotenvExport(xport) {
  return Boolean(typeof xport === "string" ? xport.startsWith("export") : xport) ? `export ` : "";
}
function dotenvValue(value, options) {
  const opts = {
    force: options?.force ?? false,
    preferred: options?.preferred || "double"
  };
  if (!opts.force && anchorRegExp(dotenvr.value).test(value) && !/^\s/.test(value)) {
    return value;
  } else {
    return dotenvQuote(value, opts.preferred);
  }
}
function dotenvComment(str, options) {
  const opts = {
    forceFormat: options?.forceFormat ?? dotenvDefaultOptions.comments.forceFormat,
    format: options?.format || dotenvDefaultOptions.comments.format
  };
  if (!str) return "";
  return !opts.forceFormat && /^[^\S\r\n]*#[^\S\r\n]*/.test(str) ? str : `${opts.format}${parseDotenvComment(str)}`;
}
function parseDotenvKey(key) {
  if (!key || !anchorRegExp(dotenvr.key).test(key)) {
    throw new Error(`Invalid dotenv variable name: ${key}`);
  }
  return key;
}
function parseDotenvValue(value) {
  value = value || "";
  value = value.trim();
  const maybeQuote = value[0];
  value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
  if (maybeQuote === '"') {
    value = value.replace(/\\n/g, "\n");
    value = value.replace(/\\r/g, "\r");
  }
  return value;
}
function parseDotenvComment(comment) {
  if (comment === null || comment === void 0) {
    return void 0;
  }
  comment = comment.trim();
  comment = comment.replace(/^#[^\S\r\n]*/, "");
  return comment;
}
function parseDotenvGroups({
  xport,
  key,
  value,
  comment
}) {
  return {
    xport,
    key: parseDotenvKey(key),
    value: parseDotenvValue(value),
    comment: parseDotenvComment(comment)
  };
}
function sanitizeDotenvVariable(key, variable) {
  if (typeof variable === "string") {
    return {
      key: parseDotenvKey(key),
      value: variable
    };
  } else if (isPlainObject(variable)) {
    return {
      key: parseDotenvKey(variable.key ?? key),
      value: variable.value,
      comment: variable.comment,
      xport: variable.xport
    };
  } else {
    return {
      key: parseDotenvKey(key),
      value: void 0
    };
  }
}
function editDotenvContent(content, variables, options) {
  const errors = [];
  const eol = getEol(content);
  const opts = mergeOptions(dotenvDefaultOptions, options ?? {});
  for (const key in variables) {
    let updateVar2 = function(key2) {
      const linePattern = dotenvLineRegExp(strToRegExp(key2));
      content = content.replace(linePattern, (match, ...args) => {
        count++;
        if (!opts.update) {
          throw new Error(
            `Variable "${key2}" already exists. Resolve the conflict manually or enable \`options.update\`.`
          );
        }
        if (count > 1) {
          if (count === 2) {
            errors.push(
              `Multiple definitions of variable: "${key2}"${opts.deduplicate ? ". Deleting duplicates..." : ""}`
            );
          }
          return opts.deduplicate ? "" : match;
        }
        const groups = args[args.length - 1];
        const { value, xport, comment } = groups;
        const line = `${dotenvExport(envVar.xport ?? xport)}${envVar.key}=${dotenvValue(
          envVar.value ?? value ?? "",
          opts.quotes
        )}${dotenvComment(envVar.comment ?? comment, opts.comments)}`;
        return line;
      });
    };
    var updateVar = updateVar2;
    let envVar;
    let count = 0;
    try {
      envVar = sanitizeDotenvVariable(key, variables[key]);
    } catch (err) {
      errors.push(errorToString(err));
      continue;
    }
    const isRename = key !== envVar.key;
    try {
      updateVar2(key);
      if (isRename && count === 0) {
        updateVar2(envVar.key);
      }
    } catch (err) {
      errors.push(errorToString(err));
    }
    if (count === 0) {
      if (envVar.value === null || envVar.value === void 0) {
        errors.push(
          `Skipped new variable "${envVar.key}" with undefined value. Use "" as a value if you want to add an empty variable.`
        );
        continue;
      }
      const line = `${dotenvExport(envVar.xport)}${envVar.key}=${dotenvValue(
        envVar.value,
        opts.quotes
      )}${dotenvComment(envVar.comment, opts.comments)}`;
      content = `${content.trim()}${eol}${line}${eol}`;
    }
  }
  content = content.trim();
  return { content, errors };
}
function editDotenvFile(path2, variables, options) {
  let content;
  try {
    content = fs.readFileSync(path2, { encoding: "utf8" });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    } else {
      content = "";
    }
  }
  const { content: updatedContent, errors } = editDotenvContent(
    content,
    variables,
    options
  );
  fs.writeFileSync(path2, updatedContent, "utf8");
  const success = errors.length === 0;
  return { success, errors };
}
export {
  dotenvComment,
  dotenvDefaultOptions,
  dotenvExport,
  dotenvLineRegExp,
  dotenvQuote,
  dotenvQuoteMap,
  dotenvValue,
  editDotenvContent,
  editDotenvFile,
  getDotenvPath,
  getEol,
  parseDotenvComment,
  parseDotenvGroups,
  parseDotenvKey,
  parseDotenvValue,
  sanitizeDotenvVariable
};
