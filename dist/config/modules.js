import { generateIntegrityHash } from "../helpers/hash.js";
import { capitalize } from "../helpers/utils.js";
const fileNamePattern = /^(?<name>[a-zA-Z0-9]+)\.(?<extension>[a-zA-Z]+)$/;
function assertFileName(fileName) {
  if (!fileName || !fileNamePattern.test(fileName)) {
    throw new TypeError(`Invalid FileName: "${fileName}"`);
  }
}
function getDisplayName(fileName) {
  const match = fileName.match(fileNamePattern);
  const { name = "undefined", extension = "unknown" } = match.groups;
  return `${capitalize(name)} ${extension?.toUpperCase()}`;
}
function generateCdnUrl(repo, version, file) {
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.name}@${version}/dist/${file}`;
}
function getModuleHash(module, repo) {
  return generateIntegrityHash(
    generateCdnUrl(repo, module.version, module.file)
  );
}
function normalizeModule(module, fallbackVersion) {
  let mod;
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
function getEnvModules(env) {
  return env.modules.map((mod) => normalizeModule(mod, env.version));
}
function getUniqueModules(environments) {
  return Array.from(
    environments.flatMap(getEnvModules).reduce((acc, mod) => {
      const key = `${mod.file}@${mod.version}`;
      if (!acc.has(key)) {
        acc.set(key, mod);
      }
      return acc;
    }, /* @__PURE__ */ new Map()).values()
  );
}
export {
  assertFileName,
  fileNamePattern,
  generateCdnUrl,
  getDisplayName,
  getEnvModules,
  getModuleHash,
  getUniqueModules,
  normalizeModule
};
