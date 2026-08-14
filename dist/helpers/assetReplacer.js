import { extractAssets } from "./assetParser.js";
import { stringifyAssets, updateAssetUrls } from "./assetTransformer.js";
import { routes } from "./routes.js";
function getReloadScript(config) {
  if (!config.devServer.livereload) return "";
  return `<script src="${routes.server}/src/extension/dist/client.js" defer></script>`;
}
function replaceAssets(html, config) {
  const extracted = extractAssets(html);
  let cleanedHtml = html;
  for (const asset of extracted) {
    const escaped = asset.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleanedHtml = cleanedHtml.replace(new RegExp(escaped, "g"), "");
  }
  const updated = updateAssetUrls(extracted);
  const newTags = stringifyAssets(updated);
  const finalHtml = cleanedHtml.replace(
    "</body>",
    `${newTags}
${getReloadScript(config)}</body>`
  );
  return { html: finalHtml, removedCount: extracted.length };
}
export {
  getReloadScript,
  replaceAssets
};
