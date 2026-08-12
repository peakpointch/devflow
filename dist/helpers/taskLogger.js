import chalk from "chalk";
import { CliLogger } from "./logger.js";
class TaskLogger extends CliLogger {
  static activeScope = "";
  inferScope;
  rawScope;
  activeLogMethod = null;
  constructor(scope, inferScope = false) {
    super();
    this.rawScope = scope ?? "";
    this.inferScope = inferScope;
    if (this.rawScope) {
      TaskLogger.activeScope = this.rawScope;
    }
    this.colors = {
      traceScope: chalk.white,
      debugScope: chalk.magenta,
      errorScope: chalk.red,
      warnScope: chalk.yellow,
      infoScope: chalk.dim,
      successScope: chalk.green
    };
  }
  get scope() {
    if (this.inferScope) {
      this.rawScope = TaskLogger.activeScope;
    } else if (this.rawScope) {
      TaskLogger.activeScope = this.rawScope;
    }
    if (!this.rawScope) {
      return "";
    }
    const key = `${this.activeLogMethod}Scope`;
    const scopeString = `[${this.rawScope}]`;
    return this.colors[key] ? this.colors[key](scopeString) : scopeString;
  }
  setScope(scope) {
    this.rawScope = scope;
    TaskLogger.activeScope = scope;
  }
  taskLog(opts, ...msg) {
    this.rawLevel = CliLogger.translateLevel(opts.level);
    this.activeLogMethod = opts.method ?? this.rawLevel;
    const decorator = opts.icon ? ` ${opts.icon}` : "";
    const prefixes = [decorator, this.scope].filter(
      (prefix) => Boolean(prefix)
    );
    this.log(
      {
        level: opts.level,
        prefixes
      },
      ...msg
    );
  }
  trace(...msg) {
    this.taskLog(
      {
        level: "trace"
      },
      ...msg
    );
  }
  debug(...msg) {
    this.taskLog(
      {
        level: "debug",
        icon: this.colors.debug("\u25C7")
      },
      ...msg
    );
  }
  info(...msg) {
    this.taskLog(
      {
        level: "info",
        icon: this.colors.info("\u25C6")
      },
      ...msg
    );
  }
  success(...msg) {
    this.taskLog(
      {
        level: "info",
        method: "success",
        icon: this.colors.success("\u2714")
      },
      ...msg
    );
  }
  warn(...msg) {
    this.taskLog(
      {
        level: "warn",
        icon: this.colors.warn("\u26A0")
      },
      ...msg
    );
  }
  error(...msg) {
    this.taskLog(
      {
        level: "error",
        icon: this.colors.error("\u2716")
      },
      ...msg
    );
  }
  unorderedList(list, format) {
    const formatted = list.map((item) => {
      const formatted2 = format ? format(item) : `${item}`;
      return this.indent + " \u2022 " + formatted2;
    }).join(this.newLine);
    this.continue(formatted);
  }
}
const logger = new TaskLogger(void 0, true);
const authLogger = new TaskLogger("Auth");
const configLogger = new TaskLogger("Config");
const devLogger = new TaskLogger("Dev");
const buildLogger = new TaskLogger("Build");
export {
  TaskLogger,
  authLogger,
  buildLogger,
  configLogger,
  devLogger,
  logger
};
