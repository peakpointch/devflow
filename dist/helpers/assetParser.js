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
  parseAttributes: () => parseAttributes
});
module.exports = __toCommonJS(assetParser_exports);
var import_dataset = require("./dataset");
function parseAttributes(attrString) {
  const attrs = {};
  attrString.replace(/([^\s=]+)(?:="([^"]*)")?/g, (_, name, value) => {
    if (!value || value === "true") {
      attrs[name] = true;
    } else if (value === "false") {
      attrs[name] = false;
    } else {
      attrs[name] = value;
    }
    return "";
  });
  return attrs;
}
function extractAssets(html) {
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
  for (const { regex, type } of patterns) {
    let match;
    while (match = regex.exec(html)) {
      const attrs = parseAttributes(match[1]);
      if (import_dataset.dataset.attr.hmr in attrs && import_dataset.dataset.attr.local in attrs && attrs[import_dataset.dataset.attr.hmr] === true && typeof attrs[import_dataset.dataset.attr.local] === "string") {
        assets.push({
          tag: match[0],
          attrs,
          filePath: attrs[import_dataset.dataset.attr.local],
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
  parseAttributes
});
