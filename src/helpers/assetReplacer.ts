import { DevflowConfig } from "../parse-config";
import { AssetAttributes } from "../types/assets";
import { extractAssets } from "./assetParser";
import { stringifyAssets, updateAssetUrls } from "./assetTransformer";
import { getReloadScript } from "./livereload";

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

export function replaceAssets(html: string, config: DevflowConfig) {
  const configAttrs = Array.isArray(config.scriptAttribute)
    ? config.scriptAttribute
    : [config.scriptAttribute].filter(Boolean);

  if (!configAttrs.length) return { html, removedCount: 0 };

  const extracted = extractAssets(html, configAttrs);

  // Remove all original tags (scripts and links)
  let cleanedHtml = html;
  for (const asset of extracted) {
    const escaped = asset.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleanedHtml = cleanedHtml.replace(new RegExp(escaped, "g"), "");
  }

  const updated = updateAssetUrls(extracted, config);
  const newTags = stringifyAssets(updated);

  // Inject before closing body
  const finalHtml = cleanedHtml.replace(
    "</body>",
    `${newTags}\n${getReloadScript(config)}</body>`,
  );

  return { html: finalHtml, removedCount: extracted.length };
}
