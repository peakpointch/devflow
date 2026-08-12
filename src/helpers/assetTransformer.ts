import type { ExtractedAsset } from "../types/assets.js";
import { routes } from "./routes.js";
import { dataset } from "./dataset.js";

export function updateAssetUrls(assets: ExtractedAsset[]): ExtractedAsset[] {
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

export function stringifyAssets(assets: ExtractedAsset[]): string {
  return assets
    .map((asset) => {
      const attrString = Object.entries(asset.attrs)
        .filter(([k]) => k !== "integrity")
        .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
        .join(" ");

      return asset.type === "script"
        ? `<script ${attrString}></script>`
        : `<link ${attrString}>`;
    })
    .join("\n");
}
