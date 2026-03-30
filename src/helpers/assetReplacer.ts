import { DevflowConfig } from "../config";
import { extractAssets } from "./assetParser";
import { stringifyAssets, updateAssetUrls } from "./assetTransformer";
import { routes } from "./routes";

export function getReloadScript(config: DevflowConfig): string {
  if (!config.livereload) return "";
  return `<script src="${routes.devflow}/src/extension/dist/client.js" defer></script>`;
}

export function replaceAssets(html: string, config: DevflowConfig) {
  const extracted = extractAssets(html);

  // Remove all original tags (scripts and links)
  let cleanedHtml = html;
  for (const asset of extracted) {
    const escaped = asset.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleanedHtml = cleanedHtml.replace(new RegExp(escaped, "g"), "");
  }

  const updated = updateAssetUrls(extracted);
  const newTags = stringifyAssets(updated);

  // Inject before closing body
  const finalHtml = cleanedHtml.replace(
    "</body>",
    `${newTags}\n${getReloadScript(config)}</body>`,
  );

  return { html: finalHtml, removedCount: extracted.length };
}
