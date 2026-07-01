import chalk from "chalk";
import log from "loglevel";
class CliLogger {
  static instance;
  logger;
  _scope = "Scope";
  constructor() {
    this.logger = log.getLogger("peakflow");
    this.logger.setLevel("info");
  }
  static getInstance() {
    if (!this.instance) {
      this.instance = new CliLogger();
    }
    return this.instance;
  }
  set scope(scope) {
    this._scope = `[${scope}]`;
  }
  get scope() {
    return this._scope;
  }
  get indent() {
    return " ".repeat(this._scope.length);
  }
  get newLine() {
    return "\n";
  }
  get nextLine() {
    return this.newLine + this.indent;
  }
  setScope(scope) {
    this.scope = scope;
  }
  setLevel(level) {
    this.logger.setLevel(level);
  }
  trace(...msg) {
    this.logger.trace(chalk.cyan(this.scope), ...msg);
  }
  debug(...msg) {
    this.logger.debug(chalk.blue(this.scope), ...msg);
  }
  info(...msg) {
    this.logger.info(chalk.green(this.scope), ...msg);
  }
  warn(...msg) {
    this.logger.warn(chalk.yellow(this.scope), ...msg);
  }
  error(...msg) {
    this.logger.error(chalk.red(this.scope), ...msg);
  }
}
const logger = CliLogger.getInstance();
var logger_default = logger;
export {
  CliLogger,
  logger_default as default
};
