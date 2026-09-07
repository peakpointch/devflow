import { logger } from "../helpers/taskLogger.js";
import {
  generateCdnUrl,
  getDisplayName,
  getFilePath,
  getModuleHash
} from "../config/modules.js";
import { assetDataset } from "../helpers/dataset.js";
async function generateRegisterScripts(modules, repo) {
  return Promise.all(
    modules.map(async (mod) => {
      const hash = await getModuleHash(repo, mod);
      return {
        canCopy: true,
        displayName: getDisplayName(getFilePath(mod.path)),
        hostedLocation: generateCdnUrl(repo, mod),
        integrityHash: hash,
        version: mod.version
      };
    })
  );
}
async function generateUpsertScripts({
  modules,
  scriptsByHash,
  repo,
  dryRun = false
}) {
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
          [assetDataset.attr.hmr]: "true",
          [assetDataset.attr.local]: getFilePath(mod.path)
        }
      };
    })
  );
}
export {
  generateRegisterScripts,
  generateUpsertScripts
};
