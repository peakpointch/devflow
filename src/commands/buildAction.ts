import { buildProd } from "../build.js";
import { parseConfigAction } from "../config/parse.js";
import logger from "../helpers/logger.js";

export async function buildAction() {
  const config = await parseConfigAction();

  logger.setScope("Build");
  logger.info("Building production bundle...");

  try {
    buildProd(config);

    logger.info(
      `Complete! Compiled ${logger.num(config.build.modules.length)} files to ${logger.var(config.build.outdir)}`,
    );
  } catch (err) {
    logger.error("Failed to build!\n", err);
  }
}
