import { build } from "esbuild";
import parseConfig from "./parse-config";
import { prefixX } from "./cli";

export default async function builder(configFilePath) {
  try {
    const config = parseConfig(configFilePath);

    console.log(prefixX, "Building production bundle...");

    await build({
      entryPoints: config.source,
      bundle: true,
      outdir: config.dist,
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
