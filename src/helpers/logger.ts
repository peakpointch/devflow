import chalk from "chalk";
import log, { type LogLevelNames } from "loglevel";
import { PlainObject } from "../types/utils.js";

export type LogLevelNumber = 0 | 1 | 2 | 3 | 4 | 5;

export class CliLogger {
  public static instance: CliLogger;
  public logger: log.Logger;
  private _scope: string = "Scope";

  private constructor() {
    this.logger = log.getLogger("peakflow");
    this.logger.setLevel("info");
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new CliLogger();
    }
    return this.instance;
  }

  public set scope(scope: string) {
    this._scope = `[${scope}]`;
  }

  public get scope(): string {
    return this._scope;
  }

  public get indent(): string {
    return " ".repeat(this._scope.length);
  }

  public get newLine(): string {
    return "\n";
  }

  public get nextLine(): string {
    return this.newLine + this.indent;
  }

  public setScope(scope: string) {
    this.scope = scope;
  }

  public setLevel(level: LogLevelNames | LogLevelNumber): void {
    this.logger.setLevel(level);
  }

  public getLevel(): LogLevelNumber {
    return this.logger.getLevel();
  }

  public trace(...msg: any[]): void {
    this.logger.trace(chalk.cyan(this.scope), ...msg);
  }

  public debug(...msg: any[]): void {
    this.logger.debug(chalk.blue(this.scope), ...msg);
  }

  public info(...msg: any[]): void {
    this.logger.info(chalk.green(this.scope), ...msg);
  }

  public warn(...msg: any[]): void {
    this.logger.warn(chalk.yellow(this.scope), ...msg);
  }

  public error(...msg: any[]): void {
    this.logger.error(chalk.red(this.scope), ...msg);
  }

  public var(str: string): string {
    return chalk.cyan(str);
  }

  public num(num: number): string {
    return chalk.cyan(num);
  }

  public json(obj: object): string {
    return logger.newLine + JSON.stringify(obj, undefined, 4);
  }
}

const logger = CliLogger.getInstance();

export default logger;
