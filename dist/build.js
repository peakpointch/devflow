import { build } from "esbuild";
async function buildDev(config) {
  await build({
    entryPoints: config.build.modules,
    bundle: true,
    outdir: config.build.outdir,
    sourcemap: true,
    minify: false,
    format: "iife",
    target: ["es2020"],
    platform: "browser",
    external: ["@vime/core"]
  });
}
async function buildProd(config) {
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
    external: ["@vime/core"]
  });
}
export {
  buildDev,
  buildProd
};
