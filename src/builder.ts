import { build } from "esbuild";
import parseConfig from "../dist/parseConfig.js";
import { prefixX } from ".";

const buildServer = async (configFilePath) => {
  try {
    const config = parseConfig(configFilePath);

    console.log(prefixX, "Building production bundle...");

    const result = await build({
      entryPoints: Array.isArray(config.source)
        ? config.source
        : [config.source],
      bundle: true,
      outdir: config.dist,
      minify: true,
      sourcemap: true,
      target: ["ES2020"], // adjust target as needed
      format: "iife", // output as ESM; use "cjs" if needed
      splitting: false,
      treeShaking: true,
      platform: "browser",
      external: [], // add dependencies to exclude if needed
    });

    console.log(prefixX, "Build done!");
  } catch (err) {
    console.error(prefixX, "Build failed:", err);
  }
};

export default buildServer;
