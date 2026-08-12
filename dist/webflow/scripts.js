import { logger } from "../helpers/taskLogger.js";
import {
  assertFileName,
  generateCdnUrl,
  getDisplayName,
  getModuleHash
} from "../config/modules.js";
import { generateIntegrityHash } from "../helpers/hash.js";
function generateRegisterScripts(modules, repo) {
  return modules.map((mod) => {
    assertFileName(mod.file);
    const cdnUrl = generateCdnUrl(repo, mod.version, mod.file);
    return {
      canCopy: true,
      displayName: getDisplayName(mod.file),
      hostedLocation: cdnUrl,
      integrityHash: generateIntegrityHash(cdnUrl),
      version: mod.version
    };
  });
}
function generateUpsertScripts({
  modules,
  scriptsByHash,
  repo,
  dryRun = false
}) {
  return modules.map((mod) => {
    const scriptHash = getModuleHash(mod, repo);
    const script = scriptsByHash.get(scriptHash);
    if (!dryRun && !script?.id) {
      logger.debug("Found script is invalid:", logger.newLine, script);
      throw new Error("Cannot upsert unregistered script");
    }
    return {
      id: script?.id ?? `${mod.file} [unregistered]`,
      location: mod.file.endsWith(".css") ? "header" : "footer",
      version: mod.version,
      attributes: {
        "data-peakflow-hmr": "true",
        "data-peakflow-local": mod.file
      }
    };
  });
}
export {
  generateRegisterScripts,
  generateUpsertScripts
};
