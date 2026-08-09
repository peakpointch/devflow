import { PeakflowEnv, PeakflowModule, PeakflowRepo } from "peakflow/config";

import { generateIntegrityHash } from "../helpers/hash.js";
import { capitalize } from "../helpers/utils.js";
import type { Brand } from "../types/utils.js";

/**
 * File name of a module
 */
export type ModuleFileName = Brand<string, "ModuleFileName">;

/**
 * A RegExp representing a valid file name of a script module
 */
export const fileNamePattern =
  /^(?<name>[a-zA-Z0-9]+)\.(?<extension>[a-zA-Z]+)$/;

/**
 * Validate the modules filename via the file name RegExp
 */
export function assertFileName(
  fileName: string,
): asserts fileName is ModuleFileName {
  if (!fileName || !fileNamePattern.test(fileName)) {
    throw new TypeError(`Invalid FileName: "${fileName}"`);
  }
}

/**
 * Convert the filename to a script display name.
 */
export function getDisplayName(fileName: ModuleFileName): string {
  const match = fileName.match(fileNamePattern)!;
  const { name = "undefined", extension = "unknown" } = match.groups!;
  return `${capitalize(name)} ${extension?.toUpperCase()}`;
}

/**
 * Generate jsDelivr URL for a module
 */
export function generateCdnUrl(
  repo: PeakflowRepo,
  version: string,
  file: string,
): string {
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.name}@${version}/dist/${file}`;
}

/**
 * Get the integrity hash for a module (based on the CDN URL).
 */
export function getModuleHash(
  module: PeakflowModule,
  repo: PeakflowRepo,
): string {
  return generateIntegrityHash(
    generateCdnUrl(repo, module.version, module.file),
  );
}

/**
 * Normalize a module entry to { file, version }
 */
export function normalizeModule(
  module: PeakflowModule | string,
  fallbackVersion: string,
): PeakflowModule {
  let mod: PeakflowModule;
  if (typeof module === "string") {
    mod = { file: module, version: fallbackVersion };
  } else {
    mod = { file: module.file, version: module.version ?? fallbackVersion };
  }

  assertFileName(mod.file);

  if (!mod.version) {
    throw new Error(`Invalid module version: "${mod.version}"`);
  }

  return mod;
}

/**
 * Map an environments modules and normalize them.
 * @returns An array of normalized `PeakflowModule`'s
 */
export function getEnvModules(env: PeakflowEnv): PeakflowModule[] {
  return env.modules.map((mod) => normalizeModule(mod, env.version));
}

/**
 * Get all the unique modules from the projects environments
 */
export function getUniqueModules(
  environments: PeakflowEnv[],
): PeakflowModule[] {
  return Array.from(
    environments
      .flatMap(getEnvModules)
      .reduce((acc, mod) => {
        const key = `${mod.file}@${mod.version}`;
        if (!acc.has(key)) {
          acc.set(key, mod);
        }
        return acc;
      }, new Map<string, PeakflowModule>())
      .values(),
  );
}
