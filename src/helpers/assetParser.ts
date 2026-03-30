import { AssetAttributes, ExtractedAsset } from "../types/assets";
import { dataset } from "./dataset";

/**
 * Generic parser for HTML attributes
 */
export function parseAttributes(attrString: string): AssetAttributes {
  const attrs: AssetAttributes = {};
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

/**
 * Extracts specific tags (script or link) that match the provided user attributes
 */
export function extractAssets(html: string): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];

  // Regex for both <script src="..."> and <link rel="stylesheet" href="...">
  const patterns = [
    {
      regex: /<script\b([^>]*)>([\s\S]*?)<\/script>/gim,
      type: "script" as const,
      srcAttr: "src",
    },
    {
      regex: /<link\b([^>]*?rel="stylesheet"[^>]*?)>/gim,
      type: "stylesheet" as const,
      srcAttr: "href",
    },
  ];

  for (const { regex, type } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html))) {
      const attrs = parseAttributes(match[1]);

      if (
        dataset.attr.hmr in attrs &&
        dataset.attr.local in attrs &&
        attrs[dataset.attr.hmr] === true &&
        typeof attrs[dataset.attr.local] === "string"
      ) {
        assets.push({
          tag: match[0],
          attrs,
          filePath: attrs[dataset.attr.local] as string,
          type,
        });
      }
    }
  }

  return assets;
}
