import * as esbuild from "esbuild";
import vuePlugin from "esbuild-plugin-vue3";
import postCSSPlugin from "esbuild-postcss";
import fs from "fs";
import { cleanDirExcept } from "./clean-dir";
import chalk from "chalk";
import path from "path";

const outdir = "src/extension/dist";

function getManifest(): any {
  return JSON.stringify(
    JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../src/extension/manifest.json"),
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
    minify: false,
    define: {
      __VUE_OPTIONS_API__: "false", // Disable for smaller bundle
      __VUE_PROD_DEVTOOLS__: "false",
      "process.env.NODE_ENV": '"production"',
      __manifest__: getManifest(),
    },
  });

  console.log(
    chalk.green("[Build Complete]"),
    `extension: ${entryPoints.length} files compiled to ${outdir}`,
  );
}

buildExtension().catch(() => process.exit(1));
