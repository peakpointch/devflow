import { build } from "esbuild";
import { PeakflowConfig } from "peakflow/config";

/**
 * Fast build optimized for the development server
 */
export async function buildDev(config: PeakflowConfig): Promise<void> {
  await build({
    entryPoints: config.build.modules,
    bundle: true,
    outdir: config.build.outdir,
    sourcemap: true,
    minify: false,
    format: "iife",
    target: ["es2020"],
    platform: "browser",
    external: ["@vime/core"],
  });
}

export async function buildProd(config: PeakflowConfig): Promise<void> {
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
}
