import { build } from "esbuild";
import parseConfig from "../dist/parseConfig.js";

const prefixX = "⚛️  xAtom  👉";

const buildServer = async (configFilePath) => {
  try {
    const config = parseConfig(configFilePath);

    console.log(prefixX, "Building production bundle...");

    const result = await build({
      entryPoints: config.source,
      bundle: true,
      outdir: config.dist,
      minify: true,
      sourcemap: true,
      target: ["es2020"], // adjust target as needed
      format: "esm", // output as ESM; use "cjs" if needed
      splitting: true, // enable code splitting
      treeShaking: true,
      platform: "browser",
      external: [], // add dependencies to exclude if needed
    });

    console.log(
      prefixX,
      "Build done!",
      `Total ${result.outputFiles?.length || "N/A"} files built`,
    );
  } catch (err) {
    console.error(prefixX, "Build failed:", err);
  }
};

export default buildServer;
