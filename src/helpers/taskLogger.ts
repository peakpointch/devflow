import chalk from "chalk";
import { CliLogger, type LogLevelName, type LogLevelNumber } from "./logger.js";

export type TaskLogMethod = LogLevelName | "success" | null;

export class TaskLogger extends CliLogger {
  protected static activeScope = "";

  protected readonly inferScope: boolean;
  public rawScope: string;
  protected activeLogMethod: TaskLogMethod = null;

  public constructor(scope?: string, inferScope = false) {
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
      successScope: chalk.green,
    };
  }

  protected get scope(): string {
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

  public setScope(scope: string): void {
    this.rawScope = scope;
    TaskLogger.activeScope = scope;
  }

  protected taskLog(
    opts: {
      level: LogLevelNumber | LogLevelName;
      method?: TaskLogMethod;
      icon?: string;
    },
    ...msg: any[]
  ): void {
    this.rawLevel = CliLogger.translateLevel(opts.level);
    this.activeLogMethod = opts.method ?? this.rawLevel;
    const decorator = opts.icon ? ` ${opts.icon}` : "";

    const prefixes = [decorator, this.scope].filter(
      (prefix): prefix is string => Boolean(prefix),
    );

    this.log(
      {
        level: opts.level,
        prefixes,
      },
      ...msg,
    );
  }

  public trace(...msg: any[]): void {
    this.taskLog(
      {
        level: "trace",
      },
      ...msg,
    );
  }

  public debug(...msg: any[]): void {
    this.taskLog(
      {
        level: "debug",
        icon: this.colors.debug("◇"),
      },
      ...msg,
    );
  }

  public info(...msg: any[]): void {
    this.taskLog(
      {
        level: "info",
        icon: this.colors.info("◆"),
      },
      ...msg,
    );
  }

  public success(...msg: any[]): void {
    this.taskLog(
      {
        level: "info",
        method: "success",
        icon: this.colors.success("✔"),
      },
      ...msg,
    );
  }

  public warn(...msg: any[]): void {
    this.taskLog(
      {
        level: "warn",
        icon: this.colors.warn("⚠"),
      },
      ...msg,
    );
  }

  public error(...msg: any[]): void {
    this.taskLog(
      {
        level: "error",
        icon: this.colors.error("✖"),
      },
      ...msg,
    );
  }
}

export const logger = new TaskLogger(undefined, true);
export const authLogger = new TaskLogger("Auth");
export const configLogger = new TaskLogger("Config");
export const devLogger = new TaskLogger("Dev");
export const buildLogger = new TaskLogger("Build");
