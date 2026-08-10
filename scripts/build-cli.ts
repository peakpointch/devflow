import * as esbuild from "esbuild";
import fs from "node:fs";
import { parseArgs } from "node:util";

import { TaskLogger, buildLogger as logger } from "../src/helpers/taskLogger.js";
import { cleanDirExcept } from "./clean-dir.js";
import { parseNodeEnv } from "../src/helpers/utils.js";
import type { NodeEnv } from "../src/types/utils.js";
import chalk from "chalk";

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

  logger.setLevel(1)
  logger.info(
    `CLI: Building ${environment} bundle...`,
  );

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

  logger.success(
    `CLI: Compiled ${logger.num(entryPoints.length)} files to ${logger.var(outdir)} for ${logger.var(environment)}.`,
  );
}

buildCli(parseNodeEnv(args.values.env)).catch((reason) => {
  logger.error("Error while building CLI:", reason);
  process.exit(1);
});
