import * as esbuild from "esbuild";
import fs from "fs";
import { cleanDirExcept } from "./clean-dir.js";
import logger from "../src/helpers/logger.js";

const outdir = "dist/";

async function buildCLI() {
  cleanDirExcept(outdir);

  const entryPoints = fs.globSync("src/**/*.ts", {
    exclude: ["src/extension/**", "src/types**", "**/template.config.ts"],
  });

  await esbuild.build({
    bundle: false,
    entryPoints,
    outdir,
    platform: "node",
    format: "esm",
    target: "node20",
  });

  logger.setScope("Build");
  logger.info(
    `Complete! CLI: Compiled ${entryPoints.length} files to ${outdir}`,
  );
}

buildCLI().catch((reason) => {
  logger.error("Error while building CLI:", reason);
  process.exit(1);
});
