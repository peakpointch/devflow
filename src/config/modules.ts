import { PeakflowEnv, PeakflowModule, PeakflowRepo } from "peakflow/config";

import { generateIntegrityHash } from "../helpers/hash.js";
import { capitalize } from "../helpers/utils.js";
import type { Brand } from "../types/utils.js";
import { anchorRegExp, joinRegExp } from "../helpers/regexp.js";

/**
 * File path of a module
 */
export type ModuleFilePath = Brand<string, "ModuleFilePath">;

/**
 * Parts of the module path regex pattern
 */
export const pathParts = {
  prefix: /(?:\.[/\\])?/,
  path: /(?<path>(?:[^/\\]+[/\\])*)/,
  filename: /(?<filename>[a-zA-Z0-9_-]+)/,
  extension: /\.(?<extension>[a-zA-Z]+)/,
};

/**
 * A RegExp representing a valid module path of a script module
 */
const pathr = anchorRegExp(
  joinRegExp([
    pathParts.prefix,
    pathParts.path,
    pathParts.filename,
    pathParts.extension,
  ]),
);

/**
 * Validate the modules filename via the file name RegExp
 */
export function assertFilePath(
  filePath: string,
): asserts filePath is ModuleFilePath {
  if (!filePath || !pathr.test(filePath)) {
    throw new TypeError(`Invalid FileName: "${filePath}"`);
  }
}

/**
 * Get the file name from a path
 */
export function getFilePath(path: string): ModuleFilePath {
  const filePath = path.replace(anchorRegExp(pathParts.prefix, "start"), "");
  assertFilePath(filePath);
  return filePath;
}

/**
 * Get the file name from a path
 */
export function getFileName(filePath: ModuleFilePath): string {
  const match = filePath.match(pathr)!;
  const { filename = "undefined", extension = "unknown" } = match.groups!;
  return `${filename}.${extension}`;
}

/**
 * Convert the file path to a script display name.
 */
export function getDisplayName(filePath: ModuleFilePath): string {
  const match = filePath.match(pathr)!;
  const { filename = "undefined", extension = "unknown" } = match.groups!;
  return `${capitalize(filename)} ${extension?.toUpperCase()}`;
}

/**
 * Generate jsDelivr URL for a module
 */
export function generateCdnUrl(
  repo: PeakflowRepo,
  mod: PeakflowModule,
): string {
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.name}@${mod.version}/${getFilePath(mod.path)}`;
}

/**
 * Get the integrity hash for a module (based on the CDN URL).
 */
export function getModuleHash(
  repo: PeakflowRepo,
  module: PeakflowModule,
): string {
  return generateIntegrityHash(generateCdnUrl(repo, module));
}

/**
 * Get all the unique modules from the projects environments
 */
export function getUniqueModules(
  environments: PeakflowEnv[],
): PeakflowModule[] {
  return Array.from(
    environments
      .flatMap((env) => env.modules)
      .reduce((acc, mod) => {
        const key = `${mod.path}@${mod.version}`;
        if (!acc.has(key)) {
          acc.set(key, mod);
        }
        return acc;
      }, new Map<string, PeakflowModule>())
      .values(),
  );
}
