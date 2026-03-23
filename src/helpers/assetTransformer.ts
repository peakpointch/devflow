import { ExtractedAsset } from "../types/assets";
import { DevflowConfig } from "../config";
import { routes } from "../devflow";

export function updateAssetUrls(
  assets: ExtractedAsset[],
  config: DevflowConfig,
): ExtractedAsset[] {
  return assets.map((asset) => {
    const isMatched = config.scriptList.includes(asset.filename);
    if (!isMatched) return asset;

    const newAttrs = { ...asset.attrs };
    const localUrl = `${routes.dist}/${asset.filename}`;

    if (asset.type === "script") {
      newAttrs.src = localUrl;
    } else {
      newAttrs.href = localUrl;
      // Mark this for the hot-reload script to find
      newAttrs["data-devflow-css"] = "true";
    }

    return { ...asset, attrs: newAttrs };
  });
}

export function stringifyAssets(assets: ExtractedAsset[]): string {
  return assets
    .map((asset) => {
      const attrString = Object.entries(asset.attrs)
        .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
        .join(" ");

      return asset.type === "script"
        ? `<script ${attrString}></script>`
        : `<link ${attrString}>`;
    })
    .join("\n");
}
