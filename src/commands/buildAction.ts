import { buildProd } from "../build.js";
import { parseConfig, parseConfigAction } from "../config/parse.js";
import logger from "../helpers/logger.js";
import { PeakflowConfig } from "peakflow/config";

export async function buildAction() {
  const config = await parseConfigAction();

  logger.setScope("Build");
  logger.info("Building production bundle...");

  try {
    buildProd(config);

    logger.info(
      `Complete! Compiled ${config.build.modules.length} files to ${config.build.outdir}`,
    );
  } catch (err) {
    logger.error("Failed to build!\n", err);
  }
}
