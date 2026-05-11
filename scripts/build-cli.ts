import * as esbuild from "esbuild";
import fs from "fs";
import { cleanDirExcept } from "./clean-dir.js";
import chalk from "chalk";

const outdir = "dist/";

async function buildCLI() {
  cleanDirExcept(outdir);

  const entryPoints = fs.globSync("src/**/*.ts", {
    exclude: ["src/extension/**", "src/types**"],
  });

  await esbuild.build({
    bundle: false,
    entryPoints,
    outdir,
    platform: "node",
    format: "esm",
    target: "node20",
  });

  console.log(
    chalk.green("[Build Complete]"),
    `CLI: ${entryPoints.length} files compiled to ${outdir}`,
  );
}

buildCLI().catch(() => process.exit(1));
