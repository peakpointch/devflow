import * as esbuild from "esbuild";
import vuePlugin from "esbuild-plugin-vue3";
import postCSSPlugin from "esbuild-postcss";
import fs from "fs";
import { cleanDirExcept } from "./clean-dir.js";
import chalk from "chalk";
import path from "path";
import logger from "../src/helpers/logger.js";

const outdir = "src/extension/dist";

function getManifest(): any {
  return JSON.stringify(
    JSON.parse(
      fs.readFileSync(
        path.resolve(import.meta.dirname, "../src/extension/manifest.json"),
        "utf-8",
      ),
    ),
  );
}

async function buildExtension() {
  cleanDirExcept(outdir);

  const entryPoints = [
    "src/extension/client.ts",
    "src/extension/popup.ts",
    "src/extension/main.css",
  ];

  await esbuild.build({
    bundle: true,
    entryPoints,
    outdir,
    format: "iife",
    platform: "browser",
    conditions: ["style"],
    plugins: [vuePlugin(), postCSSPlugin()],
    minify: true,
    define: {
      __VUE_OPTIONS_API__: "false", // Disable for smaller bundle
      __VUE_PROD_DEVTOOLS__: "false",
      "process.env.NODE_ENV": '"production"',
      __manifest__: getManifest(),
    },
  });

  logger.setScope("Build");
  logger.info(
    `Complete! Extension: Compiled ${entryPoints.length} files to ${outdir}`,
  );
}

buildExtension().catch((reason) => {
  logger.error("Error while building extension:", reason);
  process.exit(1);
});
