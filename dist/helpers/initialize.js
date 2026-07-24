import dotenv from "dotenv";
import logger from "./logger.js";
import { getDotenvPath } from "./dotenv.js";
import { parseNodeEnv } from "./utils.js";
function initialize() {
  dotenv.config({ path: getDotenvPath() });
  const env = parseNodeEnv("production");
  if (env === "development") {
    logger.setLevel("trace");
  } else if (env === "test") {
    logger.setLevel(5);
  } else {
    logger.setLevel("info");
  }
  logger.setScope("Peakflow");
  logger.debug("Log level:", logger.getLevel());
}
export {
  initialize
};
