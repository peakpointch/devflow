import { build } from "esbuild";
import { parseConfig, parseConfigCli as parseConfigAction } from "./config.js";
import logger from "./helpers/logger.js";
import { PeakflowConfig } from "peakflow";

export default async function buildAction() {
  const config = await parseConfigAction();

  logger.setScope("Build");
  logger.info("Building production bundle...");

  try {
    await build({
      entryPoints: config.build.modules,
      bundle: true,
      outdir: config.build.outdir,
      minify: true,
      sourcemap: true,
      format: "iife",
      target: ["ES2020"],
      treeShaking: true,
      platform: "browser",
      external: ["@vime/core"],
    });

    logger.info(
      `Complete! Compiled ${config.build.modules.length} files to ${config.build.outdir}`,
    );
  } catch (err) {
    logger.error("Failed to build!\n", err);
  }
}
