import { buildProd } from "../build.js";
import { parseConfigAction } from "../config/parse.js";
import { buildLogger as logger } from "../helpers/taskLogger.js";

export async function buildAction() {
  const config = await parseConfigAction();

  logger.info("Building production bundle...");

  try {
    await buildProd(config);

    logger.success(
      `Complete! Compiled ${logger.num(config.build.modules.length)} files to ${logger.var(config.build.outdir)}`,
    );
  } catch (err) {
    logger.error("Failed to build!\n", err);
  }
}
