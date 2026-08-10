import chalk, { ChalkInstance } from "chalk";
import log, { type LogLevelNames } from "loglevel";
import { PlainObject } from "../types/utils.js";
import { capitalize } from "./utils.js";

export type LogLevelNumber = 0 | 1 | 2 | 3 | 4 | 5;
export type LogLevelName = LogLevelNames | "silent";

function translateLogLevel(level: LogLevelName | LogLevelNumber): LogLevelName {
  const map: LogLevelName[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "silent",
  ];
  if (typeof level === "number" && 0 <= level && level <= 5) {
    return map[level]!;
  } else if ((map as string[]).includes(level as string)) {
    return level as LogLevelName;
  } else {
    throw new TypeError("Invalid log level");
  }
}

export const hex = {
  black: "#000",
  white: "#fff",
  error: "#e05353",
  success: "#93c9cc",
  warn: "#e8a917",
  debug: "#6391cf",
  brand: "#bb8354",
  brandLight: "#fcfaf7",
};

export class CliLogger {
  public static colors = {
    trace: chalk.white,
    debug: chalk.bgMagenta.hex(hex.black).bold,
    error: chalk.bgRed.hex(hex.black).bold,
    warn: chalk.bgHex(hex.warn).hex(hex.black).bold,
    info: chalk.bgHex(hex.success).hex(hex.black).bold,
    default: chalk.cyan.hex(hex.black).bold,
    scope: chalk.cyan,
    var: chalk.cyan,
    num: chalk.cyan,
  };

  public logger: log.Logger;

  protected static activeScope: string = "";

  private rawScope: string = "";
  private rawLabel: string = "";
  private rawLevel: LogLevelName;
  private instanceColors: Record<string, ChalkInstance> = {};
  private readonly inferScope: boolean;
  private readonly _indentChar = "__indent__";

  public constructor(scope?: string, inferScope = false) {
    this.setScope(scope ?? "");
    this.inferScope = inferScope;
    this.logger = log.getLogger("peakflow");
    this.rawLevel = translateLogLevel(this.logger.getLevel())
  }

  private replaceIndent(msg: any[]) {
    return msg.map((part) =>
      typeof part === "string"
        ? part.replace(this._indentChar, " ".repeat(this.rawLabel.length))
        : part,
    );
  }

  public get indent(): string {
    return this._indentChar + " ".repeat(this.scope.length);
  }

  public set colors(colors: Record<string, ChalkInstance>) {
    this.instanceColors = { ...this.instanceColors, ...colors };
  }

  public get colors(): typeof CliLogger.colors &
    Record<string, ChalkInstance> {
    return {
      ...CliLogger.colors,
      ...this.instanceColors,
    };
  }

  private get labelColor(): ChalkInstance {
    // const label = this.rawLabel.toLocaleLowerCase();
    const label = this.rawLevel;
    const key =
      label in this.colors ? (label as keyof typeof this.colors) : "default";
    return this.colors[key]!;
  }

  private get label(): string {
    if (!this.rawLabel || this.rawLabel.toLowerCase() === "trace") {
      return "";
    }
    return this.labelColor(` ${this.rawLabel} `) + " ";
  }

  public get newLine(): string {
    return "\n";
  }

  public get nextLine(): string {
    return this.newLine + this.indent;
  }

  public get scope(): string {
    if (this.inferScope) {
      this.rawScope = CliLogger.activeScope;
    } else if (this.rawScope) {
      CliLogger.activeScope = this.rawScope;
    } else {
      return "";
    }

    return this.colors.scope(`[${this.rawScope}]`);
  }

  public setScope(scope: string) {
    this.rawScope = scope;
    CliLogger.activeScope = this.rawScope;
  }

  public setLevel(level: LogLevelNames | LogLevelNumber): void {
    this.logger.setLevel(level);
  }

  public getLevel(): LogLevelNumber {
    return this.logger.getLevel();
  }

  public log(
    opts: { level: LogLevelNumber | LogLevelName; label?: string },
    ...msg: any[]
  ): void {
    this.rawLevel = translateLogLevel(opts.level);
    this.rawLabel = opts.label ?? capitalize(this.rawLevel);
    if (this.rawLevel === "silent") return;
    this.logger[this.rawLevel](this.label + this.scope, ...this.replaceIndent(msg));
  }

  public trace(...msg: any[]): void {
    this.log({ level: "trace" }, ...msg);
  }

  public debug(...msg: any[]): void {
    this.log({ level: "debug" }, ...msg);
  }

  public info(...msg: any[]): void {
    this.log({ level: "info" }, ...msg);
  }

  public warn(...msg: any[]): void {
    this.log({ level: "warn" }, ...msg);
  }

  public error(...msg: any[]): void {
    this.log({ level: "error" }, ...msg);
  }

  public var(str: string): string {
    return this.colors.var(str);
  }

  public num(num: number | string): string {
    return this.colors.num(num);
  }

  public json(obj: object): string {
    return JSON.stringify(obj, undefined, 4);
  }
}

export const logger = new CliLogger(undefined, true);
export const configLogger = new CliLogger("Config");
export const devLogger = new CliLogger("Dev");
export const buildLogger = new CliLogger("Build");

export default logger;
