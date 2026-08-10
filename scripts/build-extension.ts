import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import postCSSPlugin from "esbuild-postcss";
import vuePlugin from "esbuild-plugin-vue3";
import { parseArgs } from "node:util";

import { buildLogger as logger } from "../src/helpers/taskLogger.js";
import { cleanDirExcept } from "./clean-dir.js";
import { parseNodeEnv } from "../src/helpers/utils.js";
import type { NodeEnv } from "../src/types/utils.js";

const args = parseArgs({
  options: {
    env: {
      type: "string",
      short: "e",
      default: "production",
    },
  },
});

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

async function buildExtension(environment: NodeEnv = "production") {
  cleanDirExcept(outdir);

  const entryPoints = [
    "src/extension/client.ts",
    "src/extension/popup.ts",
    "src/extension/main.css",
  ];

  logger.setLevel(1)
  logger.info(
    `Extension: Building ${environment} bundle...`,
  );

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
      "process.env.NODE_ENV": `"${environment}"`,
      __manifest__: getManifest(),
    },
  });

  logger.success(
    `Extension: Compiled ${logger.num(entryPoints.length)} files to ${logger.var(outdir)} for ${logger.var(environment)}.`,
  );
}

buildExtension(parseNodeEnv(args.values.env)).catch((reason) => {
  logger.error("Error while building extension:", reason);
  process.exit(1);
});
