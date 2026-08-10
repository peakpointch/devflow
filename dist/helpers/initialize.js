import dotenv from "dotenv";
import { logger } from "./taskLogger.js";
import { getDotenvPath } from "./dotenv.js";
import { parseNodeEnv } from "./utils.js";
function initialize() {
  const { parsed: dotenvOutput } = dotenv.config({
    path: getDotenvPath(),
    quiet: true
  });
  const injectedCount = Object.keys(dotenvOutput ?? {}).length;
  const env = parseNodeEnv("production");
  if (env === "development") {
    logger.setLevel("trace");
  } else if (env === "test") {
    logger.setLevel(5);
  } else {
    logger.setLevel("info");
  }
  logger.setScope("Dotenv");
  logger.info(
    `Injected env ${logger.num(`(${injectedCount})`)} from ${logger.var(".env")}`
  );
  logger.setScope("Peakflow");
  logger.debug("Log level:", logger.getLevel());
}
export {
  initialize
};
