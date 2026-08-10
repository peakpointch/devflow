import chalk from "chalk";
import log from "loglevel";
import { capitalize } from "./utils.js";
function translateLogLevel(level) {
  const map = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "silent"
  ];
  if (typeof level === "number" && 0 <= level && level <= 5) {
    return map[level];
  } else if (map.includes(level)) {
    return level;
  } else {
    throw new TypeError("Invalid log level");
  }
}
const hex = {
  black: "#000",
  white: "#fff",
  error: "#e05353",
  success: "#93c9cc",
  warn: "#e8a917",
  debug: "#6391cf",
  brand: "#bb8354",
  brandLight: "#fcfaf7"
};
class CliLogger {
  static colors = {
    trace: chalk.white,
    debug: chalk.bgMagenta.hex(hex.black).bold,
    error: chalk.bgRed.hex(hex.black).bold,
    warn: chalk.bgHex(hex.warn).hex(hex.black).bold,
    info: chalk.bgHex(hex.success).hex(hex.black).bold,
    default: chalk.cyan.hex(hex.black).bold,
    scope: chalk.cyan,
    var: chalk.cyan,
    num: chalk.cyan
  };
  logger;
  static activeScope = "";
  rawScope = "";
  rawLabel = "";
  rawLevel;
  instanceColors = {};
  inferScope;
  _indentChar = "__indent__";
  constructor(scope, inferScope = false) {
    this.setScope(scope ?? "");
    this.inferScope = inferScope;
    this.logger = log.getLogger("peakflow");
    this.rawLevel = translateLogLevel(this.logger.getLevel());
  }
  replaceIndent(msg) {
    return msg.map(
      (part) => typeof part === "string" ? part.replace(this._indentChar, " ".repeat(this.rawLabel.length)) : part
    );
  }
  get indent() {
    return this._indentChar + " ".repeat(this.scope.length);
  }
  set colors(colors) {
    this.instanceColors = { ...this.instanceColors, ...colors };
  }
  get colors() {
    return {
      ...CliLogger.colors,
      ...this.instanceColors
    };
  }
  get labelColor() {
    const label = this.rawLevel;
    const key = label in this.colors ? label : "default";
    return this.colors[key];
  }
  get label() {
    if (!this.rawLabel || this.rawLabel.toLowerCase() === "trace") {
      return "";
    }
    return this.labelColor(` ${this.rawLabel} `) + " ";
  }
  get newLine() {
    return "\n";
  }
  get nextLine() {
    return this.newLine + this.indent;
  }
  get scope() {
    if (this.inferScope) {
      this.rawScope = CliLogger.activeScope;
    } else if (this.rawScope) {
      CliLogger.activeScope = this.rawScope;
    } else {
      return "";
    }
    return this.colors.scope(`[${this.rawScope}]`);
  }
  setScope(scope) {
    this.rawScope = scope;
    CliLogger.activeScope = this.rawScope;
  }
  setLevel(level) {
    this.logger.setLevel(level);
  }
  getLevel() {
    return this.logger.getLevel();
  }
  log(opts, ...msg) {
    this.rawLevel = translateLogLevel(opts.level);
    this.rawLabel = opts.label ?? capitalize(this.rawLevel);
    if (this.rawLevel === "silent") return;
    this.logger[this.rawLevel](this.label + this.scope, ...this.replaceIndent(msg));
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
const logger = new CliLogger(void 0, true);
const configLogger = new CliLogger("Config");
const devLogger = new CliLogger("Dev");
const buildLogger = new CliLogger("Build");
var logger_default = logger;
export {
  CliLogger,
  buildLogger,
  configLogger,
  logger_default as default,
  devLogger,
  hex,
  logger
};
