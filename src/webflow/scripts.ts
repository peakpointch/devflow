import { PeakflowModule, PeakflowRepo } from "peakflow/config";
import { Webflow } from "webflow-api";

import { logger } from "../helpers/taskLogger.js";
import {
  generateCdnUrl,
  getDisplayName,
  getFilePath,
  getModuleHash,
} from "../config/modules.js";
import { OptionDryRun } from "../types/cli.js";

/**
 * Build a register request for each unique module
 */
export async function generateRegisterScripts(
  modules: PeakflowModule[],
  repo: PeakflowRepo,
): Promise<Webflow.CustomCodeHostedRequest[]> {
  return Promise.all(
    modules.map(async (mod) => {
      const hash = await getModuleHash(repo, mod);
      return {
        canCopy: true,
        displayName: getDisplayName(getFilePath(mod.path)) as string,
        hostedLocation: generateCdnUrl(repo, mod),
        integrityHash: hash,
        version: mod.version,
      };
    }),
  );
}

export type GenerateUpsertScriptsOptions = {
  modules: PeakflowModule[];
  scriptsByHash: Map<string, Webflow.CustomCodeHostedResponse>;
  repo: PeakflowRepo;
} & OptionDryRun;

/**
 * Build an upsert request for each script inside all modules
 */
export async function generateUpsertScripts({
  modules,
  scriptsByHash,
  repo,
  dryRun = false,
}: GenerateUpsertScriptsOptions): Promise<Webflow.ScriptApply[]> {
  return Promise.all(
    modules.map(async (mod) => {
      const scriptHash = await getModuleHash(repo, mod);
      const script = scriptsByHash.get(scriptHash);

      if (!dryRun && !script?.id) {
        logger.debug("Found script is invalid:", logger.newLine, script);
        throw new Error("Cannot upsert unregistered script");
      }

      return {
        id: script?.id ?? `${getFilePath(mod.path)} [unregistered]`,
        location: mod.path.endsWith(".css") ? "header" : "footer",
        version: mod.version,
        attributes: {
          "data-peakflow-hmr": "true",
          "data-peakflow-local": getFilePath(mod.path),
        },
      };
    }),
  );
}
