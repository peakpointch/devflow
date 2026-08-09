import logger from "../helpers/logger.js";
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
function generateUpsertScripts(modules, scriptsByHash, repo) {
  return modules.map((mod) => {
    const scriptHash = getModuleHash(mod, repo);
    const script = scriptsByHash.get(scriptHash);
    if (!script?.id) {
      logger.debug("Script that was found is invalid:", logger.newLine, script);
      throw new Error("Cannot upsert unregistered script");
    }
    return {
      id: script.id,
      location: mod.file.endsWith(".css") ? "header" : "footer",
      version: mod.version,
      attributes: {
        "data-peakflow-hmr": "true",
        "data-peakflow-local": `dist/${mod.file}`
      }
    };
  });
}
export {
  generateRegisterScripts,
  generateUpsertScripts
};
