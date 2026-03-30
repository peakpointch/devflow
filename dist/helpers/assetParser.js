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
var assetParser_exports = {};
__export(assetParser_exports, {
  extractAssets: () => extractAssets,
  parseAttributes: () => parseAttributes,
  parseLocalPathFromcdn: () => parseLocalPathFromcdn
});
module.exports = __toCommonJS(assetParser_exports);
function parseAttributes(attrString) {
  const attrs = {};
  attrString.replace(/([^\s=]+)(?:="([^"]*)")?/g, (_, name, value) => {
    attrs[name] = value ?? true;
    return "";
  });
  return attrs;
}
function parseLocalPathFromcdn(source) {
  const jsDelivrRegex = /(?:@[\d.]+|npm\/[^@/]+@[\d.]+)\/(.*)$|gh\/[^/]+\/[^/]+\/(.*)$/;
  const match = source.match(jsDelivrRegex);
  const fullInternalPath = match ? match[1] || match[2] : source.replace(/^https?:\/\/[^/]+\//, "");
  const pathParts = fullInternalPath.split("/");
  const fileName = pathParts.pop() || "";
  const filePath = pathParts.join("/");
  return {
    filePath,
    fileName
  };
}
function extractAssets(html, configAttrs) {
  const assets = [];
  const patterns = [
    {
      regex: /<script\b([^>]*)>([\s\S]*?)<\/script>/gim,
      type: "script",
      srcAttr: "src"
    },
    {
      regex: /<link\b([^>]*?rel="stylesheet"[^>]*?)>/gim,
      type: "stylesheet",
      srcAttr: "href"
    }
  ];
  for (const { regex, type, srcAttr } of patterns) {
    let match;
    while (match = regex.exec(html)) {
      const attrs = parseAttributes(match[1]);
      if (configAttrs.some((attr) => attr in attrs)) {
        const source = attrs[srcAttr];
        const { fileName, filePath } = parseLocalPathFromcdn(source);
        assets.push({
          tag: match[0],
          attrs,
          fileName,
          filePath,
          type
        });
      }
    }
  }
  return assets;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractAssets,
  parseAttributes,
  parseLocalPathFromcdn
});
