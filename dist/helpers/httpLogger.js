import chalk from "chalk";
import { CliLogger, hex } from "./logger.js";
class HttpLogger extends CliLogger {
  static colors = {
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
    protocol: chalk.cyan.bold
  };
  rawScope;
  constructor(scope = "Server") {
    super();
    this.rawScope = scope;
    this.colors = HttpLogger.colors;
  }
  get httpColors() {
    return this.colors;
  }
  get scope() {
    return this.httpColors.scope(`[${this.rawScope}]`);
  }
  getStatusClass(status) {
    if (status >= 500) return "5xx";
    if (status >= 400) return "4xx";
    if (status >= 300) return "3xx";
    if (status >= 200) return "2xx";
    return "1xx";
  }
  method(method, status) {
    const colorName = `method${this.getStatusClass(status)}`;
    const color = this.httpColors[colorName];
    return color ? color(` ${method} `) : method;
  }
  status(status) {
    const colorName = `status${this.getStatusClass(status)}`;
    const color = this.httpColors[colorName];
    return color ? color(status) : status.toString();
  }
  duration(duration) {
    let color = this.httpColors.duration;
    if (duration >= 1e3) color = this.httpColors.durationVerySlow;
    if (duration >= 200) color = this.httpColors.durationSlow;
    return color(`${Math.round(duration)}ms`);
  }
  request({ method, path, status, duration }) {
    const statusClass = this.getStatusClass(status);
    this.log(
      {
        level: statusClass === "5xx" ? "error" : statusClass === "4xx" ? "warn" : "info",
        prefixes: [this.scope, this.method(method, status)]
      },
      `${this.var(path)} returned ${this.status(status)} in ${this.duration(duration)}`
    );
  }
  connection({ protocol, path, state }) {
    this.log(
      {
        level: "info",
        prefixes: [this.scope, this.httpColors.protocol(protocol)]
      },
      `${this.var(path)} ${state}`
    );
  }
}
const serverLogger = new HttpLogger("Server");
export {
  HttpLogger,
  serverLogger
};
