var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var assetReplacer_exports = {};
__export(assetReplacer_exports, {
  getReloadScript: () => getReloadScript,
  replaceAssets: () => replaceAssets
});
module.exports = __toCommonJS(assetReplacer_exports);
var import_assetParser = require("./assetParser");
var import_assetTransformer = require("./assetTransformer");
var import_routes = require("./routes");
function getReloadScript(config) {
  if (!config.livereload) return "";
  return `<script src="${import_routes.routes.devflow}/src/extension/dist/client.js" defer></script>`;
}
function replaceAssets(html, config) {
  const extracted = (0, import_assetParser.extractAssets)(html);
  let cleanedHtml = html;
  for (const asset of extracted) {
    const escaped = asset.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleanedHtml = cleanedHtml.replace(new RegExp(escaped, "g"), "");
  }
  const updated = (0, import_assetTransformer.updateAssetUrls)(extracted);
  const newTags = (0, import_assetTransformer.stringifyAssets)(updated);
  const finalHtml = cleanedHtml.replace(
    "</body>",
    `${newTags}
${getReloadScript(config)}</body>`
  );
  return { html: finalHtml, removedCount: extracted.length };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getReloadScript,
  replaceAssets
});
