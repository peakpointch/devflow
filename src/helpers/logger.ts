import stringWidth from "string-width";
import chalk, { ChalkInstance } from "chalk";
import log, { type LogLevelNames } from "loglevel";

export type LogLevelNumber = 0 | 1 | 2 | 3 | 4 | 5;
export type LogLevelName = LogLevelNames | "silent";

export const hex = {
  black: "#000",
  white: "#fff",
  error: "#e05353",
  info: "#93c9cc",
  success: "#93c9cc",
  warn: "#e8a917",
  debug: "#6391cf",
  brand: "#bb8354",
  brandLight: "#fcfaf7",
};

export class CliLogger {
  public static colors = {
    trace: chalk.white,
    debug: chalk.magenta,
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.white,
    success: chalk.green,
    default: chalk.cyan,
    var: chalk.cyan,
    num: chalk.cyan,
  };

  public readonly logger: log.Logger;
  public readonly indent = "__indent__";

  protected prefixes: string[] = [];
  protected rawLevel: LogLevelName;

  private instanceColors: Record<string, ChalkInstance> = {};

  public constructor() {
    this.logger = log.getLogger("peakflow");
    this.rawLevel = CliLogger.translateLevel(this.logger.getLevel());
  }

  public static translateLevel(
    level: LogLevelName | LogLevelNumber,
  ): LogLevelName {
    const map: LogLevelName[] = [
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "silent",
    ];

    if (typeof level === "number" && level >= 0 && level <= 5) {
      return map[level]!;
    }

    if ((map as string[]).includes(level as string)) {
      return level as LogLevelName;
    }

    throw new TypeError("Invalid log level");
  }
  public set colors(colors: Record<string, ChalkInstance>) {
    this.instanceColors = {
      ...this.instanceColors,
      ...colors,
    };
  }

  public get colors(): typeof CliLogger.colors & Record<string, ChalkInstance> {
    return {
      ...CliLogger.colors,
      ...this.instanceColors,
    };
  }

  protected get prefix(): string {
    if (this.prefixes.length === 0) {
      return "";
    }

    return this.prefixes.join(" ");
  }

  protected replaceIndent(msg: any[], customIndent?: string): any[] {
    const indent = " ".repeat(stringWidth(this.prefix));

    return msg.map((part) =>
      typeof part === "string"
        ? part.replace(this.indent, customIndent ?? indent)
        : part,
    );
  }

  public get newLine(): string {
    return "\n";
  }

  public get nextLine(): string {
    return this.newLine + this.indent;
  }

  public setLevel(level: LogLevelNames | LogLevelNumber): void {
    this.logger.setLevel(level);
  }

  public getLevel(): LogLevelNumber {
    return this.logger.getLevel();
  }

  public log(
    opts: {
      level: LogLevelNumber | LogLevelName;
      prefixes?: string[];
      indent?: string;
    },
    ...msg: any[]
  ): void {
    this.rawLevel = CliLogger.translateLevel(opts.level);

    if (this.rawLevel === "silent") {
      return;
    }

    this.prefixes = opts.prefixes ?? [];

    this.logger[this.rawLevel](
      this.prefix,
      ...this.replaceIndent(msg, opts.indent),
    );
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
