import { AssetAttributes, ExtractedAsset } from "../types/assets";

/**
 * Generic parser for HTML attributes
 */
export function parseAttributes(attrString: string): AssetAttributes {
  const attrs: AssetAttributes = {};
  attrString.replace(/([^\s=]+)(?:="([^"]*)")?/g, (_, name, value) => {
    attrs[name] = value ?? true;
    return "";
  });
  return attrs;
}

/**
 * Extracts specific tags (script or link) that match the provided user attributes
 */
export function extractAssets(
  html: string,
  configAttrs: string[],
): ExtractedAsset[] {
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

  for (const { regex, type, srcAttr } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html))) {
      const attrs = parseAttributes(match[1]);

      if (configAttrs.some((attr) => attr in attrs)) {
        const source = attrs[srcAttr] as string;
        assets.push({
          tag: match[0],
          attrs,
          filename: source ? source.split("/").pop() || "" : "",
          type,
        });
      }
    }
  }
  return assets;
}
