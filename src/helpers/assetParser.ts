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

interface PathResult {
  filePath: string;
  fileName: string;
}

/**
 * Extracts the local repository path from a JSDelivr URL (GitHub or NPM).
 * Falls back to stripping the domain if no CDN pattern matches.
 */
export function parseLocalPathFromcdn(source: string): PathResult {
  // Pattern 1: GitHub (@version/path or gh/user/repo/path)
  // Pattern 2: NPM (npm/package@version/path)
  const jsDelivrRegex =
    /(?:@[\d.]+|npm\/[^@/]+@[\d.]+)\/(.*)$|gh\/[^/]+\/[^/]+\/(.*)$/;
  const match = source.match(jsDelivrRegex);

  // Extract the raw path (e.g., "dist/app.js" or "src/styles/main.css")
  const fullInternalPath = match
    ? match[1] || match[2]
    : source.replace(/^https?:\/\/[^/]+\//, ""); // Fallback: remove domain only

  const pathParts = fullInternalPath.split("/");
  const fileName = pathParts.pop() || "";
  const filePath = pathParts.join("/");

  return {
    filePath,
    fileName,
  };
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

        const { fileName, filePath } = parseLocalPathFromcdn(source);

        assets.push({
          tag: match[0],
          attrs,
          fileName,
          filePath,
          type,
        });
      }
    }
  }

  return assets;
}
