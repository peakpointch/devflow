import dotenv from "dotenv";

import { logger } from "./taskLogger.js";
import { getDotenvPath } from "./dotenv.js";
import { parseNodeEnv } from "./utils.js";

export function initialize(): void {
  const { parsed: dotenvOutput } = dotenv.config({ path: getDotenvPath(), quiet: true});
  const injectedCount = Object.keys(dotenvOutput ?? {}).length
  const env = parseNodeEnv(process.env.NODE_ENV);

  if (env === "development") {
    logger.setLevel("trace");
  } else if (env === "test") {
    logger.setLevel(5);
  } else {
    logger.setLevel("info");
  }

  logger.setScope("Dotenv");
  logger.info(`Injected env ${logger.num(`(${injectedCount})`)} from ${logger.var(".env")}`)
  logger.setScope("Peakflow");
  logger.debug("Log level:", logger.getLevel());
}
