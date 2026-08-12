import { generateIntegrityHash } from "../helpers/hash.js";
import { capitalize } from "../helpers/utils.js";
import { anchorRegExp, joinRegExp } from "../helpers/regexp.js";
const pathParts = {
  prefix: /(?:\.[/\\])?/,
  path: /(?<path>(?:[^/\\]+[/\\])*)/,
  filename: /(?<filename>[a-zA-Z0-9_-]+)/,
  extension: /\.(?<extension>[a-zA-Z]+)/
};
const pathr = anchorRegExp(
  joinRegExp([
    pathParts.prefix,
    pathParts.path,
    pathParts.filename,
    pathParts.extension
  ])
);
function assertFilePath(filePath) {
  if (!filePath || !pathr.test(filePath)) {
    throw new TypeError(`Invalid FileName: "${filePath}"`);
  }
}
function getFilePath(path) {
  const filePath = path.replace(anchorRegExp(pathParts.prefix, "start"), "");
  assertFilePath(filePath);
  return filePath;
}
function getFileName(filePath) {
  const match = filePath.match(pathr);
  const { filename = "undefined", extension = "unknown" } = match.groups;
  return `${filename}.${extension}`;
}
function getDisplayName(filePath) {
  const match = filePath.match(pathr);
  const { filename = "undefined", extension = "unknown" } = match.groups;
  return `${capitalize(filename)} ${extension?.toUpperCase()}`;
}
function generateCdnUrl(repo, mod) {
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.name}@${mod.version}/${getFilePath(mod.path)}`;
}
function getModuleHash(repo, module) {
  return generateIntegrityHash(generateCdnUrl(repo, module));
}
function getUniqueModules(environments) {
  return Array.from(
    environments.flatMap((env) => env.modules).reduce((acc, mod) => {
      const key = `${mod.path}@${mod.version}`;
      if (!acc.has(key)) {
        acc.set(key, mod);
      }
      return acc;
    }, /* @__PURE__ */ new Map()).values()
  );
}
export {
  assertFilePath,
  generateCdnUrl,
  getDisplayName,
  getFileName,
  getFilePath,
  getModuleHash,
  getUniqueModules,
  pathParts
};
