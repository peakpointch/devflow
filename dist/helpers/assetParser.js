import { dataset } from "./dataset.js";
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
      const attrs = parseAttributes(match[1] || "");
      if (dataset.attr.hmr in attrs && dataset.attr.local in attrs && attrs[dataset.attr.hmr] === true && typeof attrs[dataset.attr.local] === "string") {
        assets.push({
          tag: match[0],
          attrs,
          filePath: attrs[dataset.attr.local],
          type
        });
      }
    }
  }
  return assets;
}
export {
  extractAssets,
  parseAttributes
};
