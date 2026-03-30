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
var assetTransformer_exports = {};
__export(assetTransformer_exports, {
  stringifyAssets: () => stringifyAssets,
  updateAssetUrls: () => updateAssetUrls
});
module.exports = __toCommonJS(assetTransformer_exports);
var import_routes = require("./routes");
function updateAssetUrls(assets, config) {
  return assets.map((asset) => {
    const newAttrs = { ...asset.attrs };
    const localUrl = `${import_routes.routes.app}/${asset.filePath}/${asset.fileName}`.replace(/\/+/g, "/");
    if (asset.type === "script") {
      newAttrs.src = localUrl;
    } else {
      newAttrs.href = localUrl;
      newAttrs["data-devflow-css"] = "true";
    }
    return { ...asset, attrs: newAttrs };
  });
}
function stringifyAssets(assets) {
  return assets.map((asset) => {
    const attrString = Object.entries(asset.attrs).map(([k, v]) => v === true ? k : `${k}="${v}"`).join(" ");
    return asset.type === "script" ? `<script ${attrString}></script>` : `<link ${attrString}>`;
  }).join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  stringifyAssets,
  updateAssetUrls
});
