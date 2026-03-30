import * as esbuild from "esbuild";
import fs from "fs";
import { cleanDirExcept } from "./clean-dir";
import chalk from "chalk";

const outdir = "src/extension/dist";

async function buildExtension() {
  cleanDirExcept(outdir);

  const entryPoints = ["src/extension/client.ts", "src/extension/popup.ts"];

  await esbuild.build({
    bundle: true,
    entryPoints,
    outdir,
    format: "iife",
    platform: "browser",
    minify: false,
  });

  console.log(
    chalk.green("[Build Complete]"),
    `extension: ${entryPoints.length} files compiled to ${outdir}`,
  );
}

buildExtension().catch(() => process.exit(1));
