import { PeakflowConfig } from "peakflow/config";
import { extractAssets } from "./assetParser.js";
import { stringifyAssets, updateAssetUrls } from "./assetTransformer.js";
import { routes } from "./routes.js";

export function getReloadScript(config: PeakflowConfig): string {
  if (!config.devServer.livereload) return "";
  return `<script src="${routes.server}/src/extension/dist/client.js" defer></script>`;
}

export function replaceAssets(html: string, config: PeakflowConfig) {
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
