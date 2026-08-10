import chalk, { ChalkInstance } from "chalk";

import { CliLogger, hex } from "./logger.js";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type HttpRequestLog = {
  method: HttpMethod;
  path: string;
  status: number;
  duration: number;
};

export type HttpConnectionLog = {
  protocol: "WS";
  path: string;
  state: "connected" | "disconnected";
};

export class HttpLogger extends CliLogger {
  public static colors = {
    ...CliLogger.colors,

    method1xx: chalk.bgGray.hex(hex.black).bold,
    method2xx: chalk.bgGreen.hex(hex.black).bold,
    method3xx: chalk.bgMagenta.hex(hex.black).bold,
    method4xx: chalk.bgYellow.hex(hex.black).bold,
    method5xx: chalk.bgRed.hex(hex.black).bold,

    status1xx: chalk.dim,
    status2xx: chalk.green,
    status3xx: chalk.magenta,
    status4xx: chalk.yellow,
    status5xx: chalk.red,

    duration: chalk.dim,
    durationSlow: chalk.hex(hex.warn),
    durationVerySlow: chalk.hex(hex.error),

    scope: chalk.dim,
    protocol: chalk.cyan.bold,
  };

  public rawScope: string;

  public constructor(scope = "Server") {
    super();

    this.rawScope = scope;
    this.colors = HttpLogger.colors;
  }

  private get httpColors(): typeof HttpLogger.colors &
    Record<string, ChalkInstance> {
    return this.colors as unknown as typeof HttpLogger.colors;
  }

  private get scope(): string {
    return this.httpColors.scope(`[${this.rawScope}]`);
  }

  private getStatusClass(
    status: number,
  ): "1xx" | "2xx" | "3xx" | "4xx" | "5xx" {
    if (status >= 500) return "5xx";
    if (status >= 400) return "4xx";
    if (status >= 300) return "3xx";
    if (status >= 200) return "2xx";
    return "1xx";
  }

  private method(method: HttpMethod, status: number): string {
    const colorName = `method${this.getStatusClass(status)}`;
    const color = this.httpColors[colorName];
    return color ? color(` ${method} `) : method;
  }

  private status(status: number): string {
    const colorName = `status${this.getStatusClass(status)}`;
    const color = this.httpColors[colorName];
    return color ? color(status) : status.toString();
  }

  private duration(duration: number): string {
    let color = this.httpColors.duration;
    if (duration >= 1000) color = this.httpColors.durationVerySlow;
    if (duration >= 200) color = this.httpColors.durationSlow;

    return color(`${Math.round(duration)}ms`);
  }

  public request({ method, path, status, duration }: HttpRequestLog): void {
    const statusClass = this.getStatusClass(status);
    this.log(
      {
        level:
          statusClass === "5xx"
            ? "error"
            : statusClass === "4xx"
              ? "warn"
              : "info",
        prefixes: [this.scope, this.method(method, status)],
      },
      `${this.var(path)} returned ${this.status(status)} in ${this.duration(duration)}`,
    );
  }

  public connection({ protocol, path, state }: HttpConnectionLog): void {
    this.log(
      {
        level: "info",
        prefixes: [this.scope, this.httpColors.protocol(protocol)],
      },
      `${this.var(path)} ${state}`,
    );
  }
}

export const serverLogger = new HttpLogger("Server");

