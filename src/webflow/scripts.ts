import { PeakflowModule, PeakflowRepo } from "peakflow/config";
import { Webflow } from "webflow-api";

import { logger } from "../helpers/taskLogger.js";
import {
  assertFileName,
  generateCdnUrl,
  getDisplayName,
  getModuleHash,
} from "../config/modules.js";
import { generateIntegrityHash } from "../helpers/hash.js";
import { OptionDryRun } from "../types/cli.js";

/**
 * Build a register request for each unique module
 */
export function generateRegisterScripts(
  modules: PeakflowModule[],
  repo: PeakflowRepo,
): Webflow.CustomCodeHostedRequest[] {
  return modules.map((mod) => {
    assertFileName(mod.file);
    const cdnUrl = generateCdnUrl(repo, mod.version, mod.file);
    return {
      canCopy: true,
      displayName: getDisplayName(mod.file) as string,
      hostedLocation: cdnUrl,
      integrityHash: generateIntegrityHash(cdnUrl),
      version: mod.version,
    };
  });
}

export type GenerateUpsertScriptsOptions = {
  modules: PeakflowModule[];
  scriptsByHash: Map<string, Webflow.CustomCodeHostedResponse>;
  repo: PeakflowRepo;
} & OptionDryRun;

/**
 * Build an upsert request for each script inside all modules
 */
export function generateUpsertScripts({
  modules,
  scriptsByHash,
  repo,
  dryRun = false,
}: GenerateUpsertScriptsOptions): Webflow.ScriptApply[] {
  return modules.map((mod) => {
    const scriptHash = getModuleHash(mod, repo);
    const script = scriptsByHash.get(scriptHash);

    if (!dryRun && !script?.id) {
      logger.debug("Found script is invalid:", logger.newLine, script);
      throw new Error("Cannot upsert unregistered script");
    }

    return {
      id: script?.id ?? "not_registered_yet",
      location: mod.file.endsWith(".css") ? "header" : "footer",
      version: mod.version,
      attributes: {
        "data-peakflow-hmr": "true",
        "data-peakflow-local": mod.file,
      },
    };
  });
}
