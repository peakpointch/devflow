import { routes } from "./routes.js";
import { dataset } from "./dataset.js";
function updateAssetUrls(assets) {
  return assets.map((asset) => {
    const newAttrs = { ...asset.attrs };
    const localUrl = `${routes.app}/${asset.filePath}`.replace(/\/+/g, "/");
    if (asset.type === "script") {
      newAttrs.src = localUrl;
    } else {
      newAttrs.href = localUrl;
      newAttrs[dataset.attr.hmr] = "true";
    }
    return { ...asset, attrs: newAttrs };
  });
}
function stringifyAssets(assets) {
  return assets.map((asset) => {
    const attrString = Object.entries(asset.attrs).map(([k, v]) => v === true ? k : `${k}="${v}"`).join(" ");
    return asset.type === "script" ? `<script ${attrString}></script>` : `<link ${attrString}>`;
  }).join("\n");
}
export {
  stringifyAssets,
  updateAssetUrls
};
