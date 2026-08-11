import stringWidth from "string-width";
import chalk from "chalk";
import log from "loglevel";
const hex = {
  black: "#000",
  white: "#fff",
  error: "#e05353",
  info: "#93c9cc",
  success: "#93c9cc",
  warn: "#e8a917",
  debug: "#6391cf",
  brand: "#bb8354",
  brandLight: "#fcfaf7"
};
class CliLogger {
  static colors = {
    trace: chalk.white,
    debug: chalk.magenta,
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.white,
    success: chalk.green,
    default: chalk.cyan,
    var: chalk.cyan,
    num: chalk.cyan
  };
  logger;
  indent = "__indent__";
  prefixes = [];
  rawLevel;
  instanceColors = {};
  constructor() {
    this.logger = log.getLogger("peakflow");
    this.rawLevel = CliLogger.translateLevel(this.logger.getLevel());
  }
  static translateLevel(level) {
    const map = [
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "silent"
    ];
    if (typeof level === "number" && level >= 0 && level <= 5) {
      return map[level];
    }
    if (map.includes(level)) {
      return level;
    }
    throw new TypeError("Invalid log level");
  }
  set colors(colors) {
    this.instanceColors = {
      ...this.instanceColors,
      ...colors
    };
  }
  get colors() {
    return {
      ...CliLogger.colors,
      ...this.instanceColors
    };
  }
  get prefix() {
    if (this.prefixes.length === 0) {
      return "";
    }
    return this.prefixes.join(" ");
  }
  replaceIndent(msg, customIndent) {
    const indent = " ".repeat(stringWidth(this.prefix));
    return msg.map(
      (part) => typeof part === "string" ? part.replace(this.indent, customIndent ?? indent) : part
    );
  }
  get newLine() {
    return "\n";
  }
  get nextLine() {
    return this.newLine + this.indent;
  }
  setLevel(level) {
    this.logger.setLevel(level);
  }
  getLevel() {
    return this.logger.getLevel();
  }
  log(opts, ...msg) {
    this.rawLevel = CliLogger.translateLevel(opts.level);
    if (this.rawLevel === "silent") {
      return;
    }
    this.prefixes = opts.prefixes ?? [];
    this.logger[this.rawLevel](
      this.prefix,
      ...this.replaceIndent(msg, opts.indent)
    );
  }
  trace(...msg) {
    this.log({ level: "trace" }, ...msg);
  }
  debug(...msg) {
    this.log({ level: "debug" }, ...msg);
  }
  info(...msg) {
    this.log({ level: "info" }, ...msg);
  }
  warn(...msg) {
    this.log({ level: "warn" }, ...msg);
  }
  error(...msg) {
    this.log({ level: "error" }, ...msg);
  }
  var(str) {
    return this.colors.var(str);
  }
  num(num) {
    return this.colors.num(num);
  }
  json(obj) {
    return JSON.stringify(obj, void 0, 4);
  }
}
export {
  CliLogger,
  hex
};
