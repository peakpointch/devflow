import * as esbuild from "esbuild";
import fs from "fs";
import { cleanDirExcept } from "./clean-dir";
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
    format: "cjs",
    target: "node16",
  });

  console.log(
    chalk.green("[Build Complete]"),
    `CLI: ${entryPoints.length} files compiled to ${outdir}`,
  );
}

buildCLI().catch(() => process.exit(1));
