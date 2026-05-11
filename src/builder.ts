import { build } from "esbuild";
import { parseConfig, parseConfigCli as parseConfigAction } from "./config.js";
import parseConfig from "./config.js";
import { PeakflowConfig } from "peakflow";

export default async function buildAction() {
  const config = await parseConfigAction();

    console.log(prefixX, "Building production bundle...");

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

    console.log(prefixX, "Build done!");
  } catch (err) {
    console.error(prefixX, "Build failed:", err);
  }
}
