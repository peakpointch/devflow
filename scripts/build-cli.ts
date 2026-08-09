import * as esbuild from "esbuild";
import fs from "node:fs";
import { parseArgs } from "node:util";

import logger from "../src/helpers/logger.js";
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

const outdir = "dist/";

async function buildCli(environment: NodeEnv = "production") {
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
    define: {
      "process.env.NODE_ENV": `"${environment}"`,
    },
  });

  logger.setScope("Build");
  logger.info(
    `CLI: Compiled ${logger.num(entryPoints.length)} files to ${logger.var(outdir)} for ${logger.var(environment)}.`,
  );
}

buildCli(parseNodeEnv(args.values.env)).catch((reason) => {
  logger.error("Error while building CLI:", reason);
  process.exit(1);
});
